import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { simpleGit } from 'simple-git';
import OpenAI from 'openai';
import { PromptLogService } from '../auth/prompt-log.service';
import { ConsumptionService } from '../consumption/consumption.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ChatDto } from './dto/chat.dto';

const WORKSPACES_DIR = 'workspaces';

interface FileEdit {
  path: string;
  content: string;
}

type AiProvider =
  | 'groq'
  | 'openai'
  | 'sudodog'
  | 'langchain'
  | 'crewai'
  | 'autogen'
  | 'autogpt'
  | 'botpress'
  | 'rasa';

const FRAMEWORK_PROVIDERS: AiProvider[] = [
  'sudodog',
  'langchain',
  'crewai',
  'autogen',
  'autogpt',
  'botpress',
  'rasa',
];

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  private groqClient: OpenAI | null = null;
  private openaiClient: OpenAI | null = null;
  private groqModel: string = 'llama-3.1-8b-instant';
  private openaiModel: string = 'gpt-4o-mini';

  constructor(
    private config: ConfigService,
    private promptLogs: PromptLogService,
    private consumption: ConsumptionService,
  ) {
    const groqKey = this.config.get<string>('GROQ_API_KEY')?.trim();
    const openaiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (groqKey) {
      this.groqClient = new OpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: groqKey,
      });
      this.groqModel = this.config.get('GROQ_MODEL', 'llama-3.1-8b-instant');
      this.logger.log('Groq AI configured');
    }
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      this.openaiModel = this.config.get('OPENAI_MODEL', 'gpt-4o-mini');
      this.logger.log('OpenAI configured');
    }
  }

  private getClientForProvider(
    provider: AiProvider | undefined,
  ): { client: OpenAI; model: string; provider: string } | null {
    if (provider && FRAMEWORK_PROVIDERS.includes(provider)) return null;
    const preferred = provider ?? (this.groqClient ? 'groq' : 'openai');
    if (preferred === 'groq' && this.groqClient) {
      return {
        client: this.groqClient,
        model: this.groqModel,
        provider: 'groq',
      };
    }
    if (preferred === 'openai' && this.openaiClient) {
      return {
        client: this.openaiClient,
        model: this.openaiModel,
        provider: 'openai',
      };
    }
    const fallback = this.groqClient ?? this.openaiClient;
    const model = this.groqClient ? this.groqModel : this.openaiModel;
    const providerName = this.groqClient ? 'groq' : 'openai';
    return fallback
      ? { client: fallback, model, provider: providerName }
      : null;
  }

  async chat(dto: ChatDto): Promise<{ reply: string }> {
    const resolved = this.getClientForProvider(
      dto.ai_provider as AiProvider | undefined,
    );
    if (!resolved) {
      throw new BadRequestException(
        'No AI configured. Set OPENAI_API_KEY or GROQ_API_KEY in .env',
      );
    }
    const { client, model, provider } = resolved;
    const projectContext = this.getProjectContextForChat(dto.project);
    const system =
      'You are a helpful assistant for the Zenlocal app. For every user message: first consider the project context below (the user selected this project in the app), then answer in a way that is relevant to this project. Always use the context to give concrete, useful answers—e.g. sidebar items, routes, structure, how things work. Do not reply with "check the code" or "use Implement" when they want information; give the answer from the context. Only when they explicitly ask to change or implement code, suggest the Implement button.' +
      (projectContext
        ? `\n\nProject context (always use this to analyze and answer):\n${projectContext}`
        : '\n\nNo project selected. Remind them to select Frontend or Backend in the Project dropdown so you can answer in relation to their project.');
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: dto.message.trim() },
        ],
      });
      const content = completion.choices[0]?.message?.content?.trim() ?? '';
      if (completion.usage) {
        await this.consumption.record(provider, model, completion.usage);
      }
      return { reply: content };
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string }; message?: string })?.error
          ?.message ??
        (err as Error)?.message ??
        'Chat request failed';
      throw new BadRequestException(msg);
    }
  }

  private getProjectContextForChat(project?: 'backend' | 'frontend'): string {
    if (!project) return '';
    if (project === 'frontend') {
      return [
        'Frontend: Angular SPA (Zenlocal).',
        'Sidebar items (in order):',
        '- Prompt — route /prompt — visible to all logged-in users. Main page: chat with AI + Implement button to apply changes on a branch.',
        '- Logs — route /prompt-logs — admin only. Prompt logs history.',
        '- Consumption — route /consumption — admin only. AI usage/consumption.',
        '- Users — route /users — admin only. Sub-routes: /users/add (add user), /users/list (user list).',
        'Layout: sidebar (nav above) + main area + header with page title and user dropdown (logout).',
      ].join('\n');
    }
    return [
      'Backend: NestJS API.',
      'Endpoints: POST /task (create branch, AI edits, push, PR), POST /task/stream (same + NDJSON step messages), POST /task/chat (conversational reply, no git).',
      'Auth: JWT, roles admin and user. Modules: auth, task, consumption, prompt-logs.',
    ].join('\n');
  }

  private getWorkspacePath(taskId: string): string {
    return path.join(process.cwd(), WORKSPACES_DIR, taskId);
  }

  private safePath(workspacePath: string, relativePath: string): string {
    const resolved = path.resolve(workspacePath, relativePath);
    if (!resolved.startsWith(workspacePath)) {
      throw new BadRequestException('Invalid file path');
    }
    return resolved;
  }

  private async listProjectContext(workspacePath: string): Promise<string> {
    const lines: string[] = [];
    const skip = new Set(['.git', 'node_modules', 'dist', 'build', '.next']);
    const ext = new Set([
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.py',
      '.json',
      '.html',
      '.css',
      '.md',
    ]);
    async function walk(dir: string, prefix: string) {
      const entries = await fs
        .readdir(dir, { withFileTypes: true })
        .catch(() => []);
      for (const e of entries) {
        if (skip.has(e.name)) continue;
        const rel = path.join(prefix, e.name);
        if (e.isDirectory()) {
          await walk(path.join(dir, e.name), rel);
        } else if (ext.has(path.extname(e.name))) {
          lines.push(rel);
        }
      }
    }
    await walk(workspacePath, '');
    return lines.slice(0, 80).join('\n');
  }

  private async generateEditsWithAI(
    workspacePath: string,
    prompt: string,
    aiProvider?: AiProvider,
  ): Promise<FileEdit[]> {
    if (aiProvider && FRAMEWORK_PROVIDERS.includes(aiProvider)) {
      throw new BadRequestException(
        'This option is a framework or benchmark tool, not a model for code generation. Use Groq or OpenAI for this task.',
      );
    }
    const resolved = this.getClientForProvider(aiProvider);
    if (!resolved) {
      throw new BadRequestException(
        'No AI configured. Set OPENAI_API_KEY or GROQ_API_KEY (free at console.groq.com) in .env',
      );
    }
    const { client, model, provider } = resolved;
    const structure = await this.listProjectContext(workspacePath);
    const system = `You are a code generator. Given a project file list and a user request, output a JSON object with a single key "files" that is an array of file changes.
Each item in "files" must be: { "path": "relative/path/from/root", "content": "full file content as string" }.
Only include files you create or modify. Use path relative to project root. Output only the JSON object, no markdown.

CRITICAL RULES - you MUST follow these:
1. MINIMAL EDIT: Change only what the user asked for. Do not add unrelated code, examples, or "improvements".
2. PRESERVE STRUCTURE: When editing an existing file, keep the entire file and insert or change only at the exact place the user specified. Do not move or duplicate existing blocks to the end of the file.
3. INSERT IN PLACE: If the user says "add X inside Y" or "after Z", insert the new content at that exact location in the file. Do not append new content at the end of the file.
4. NO DUPLICATION: Do not duplicate existing elements (e.g. do not add a second copy of a link or component). Add only the new item requested.
5. SAME STYLE: Match the existing code style, indentation, and patterns in the file (e.g. if links use routerLink and a nav-icon span, the new link must use the same structure).
6. FULL FILE: For each modified file, output the complete file content with your change applied in the correct place.`;
    const user = `Project files (relative paths):\n${structure}\n\nUser request: ${prompt}`;
    let completion: Awaited<
      ReturnType<OpenAI['chat']['completions']['create']>
    >;
    try {
      completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      });
    } catch (err: unknown) {
      const msg =
        (
          err as {
            status?: number;
            code?: string;
            error?: { message?: string };
            message?: string;
          }
        )?.error?.message ??
        (err as Error)?.message ??
        'OpenAI request failed';
      const isQuota =
        (err as { status?: number; code?: string }).status === 429 ||
        (err as { code?: string }).code === 'insufficient_quota';
      throw new BadRequestException(
        isQuota
          ? 'OpenAI quota exceeded. Add billing or check usage at platform.openai.com.'
          : msg,
      );
    }
    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) throw new BadRequestException('AI returned no content');
    if (completion.usage) {
      await this.consumption.record(provider, model, completion.usage);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('AI returned invalid JSON');
    }
    const obj = parsed as Record<string, unknown>;
    const arr = (Array.isArray(obj.files) ? obj.files : []) as FileEdit[];
    return (arr as FileEdit[]).filter(
      (x) => x?.path && typeof x.content === 'string',
    );
  }

  private async applyEdits(
    workspacePath: string,
    edits: FileEdit[],
  ): Promise<void> {
    for (const { path: relPath, content } of edits) {
      const fullPath = this.safePath(workspacePath, relPath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    }
  }

  private parseRepoOwnerName(
    repoUrl: string,
  ): { owner: string; repo: string } | null {
    const m = repoUrl.match(
      /github\.com[/:](\w[\w.-]*)\/([\w.-]+?)(?:\.git)?$/i,
    );
    return m ? { owner: m[1], repo: m[2].replace(/\.git$/, '') } : null;
  }

  private resolveRepoUrl(repoUrl: string): string {
    if (!repoUrl?.trim()) {
      const defaultUrl = this.config.get<string>('DEFAULT_REPO_URL')?.trim();
      if (!defaultUrl)
        throw new BadRequestException(
          'Send repo_url or set DEFAULT_REPO_URL in .env',
        );
      return defaultUrl;
    }
    if (/^https?:\/\//i.test(repoUrl)) return repoUrl;
    const owner = this.config.get<string>('GITHUB_DEFAULT_OWNER');
    if (!owner)
      throw new BadRequestException(
        'Use full repo URL or set GITHUB_DEFAULT_OWNER in .env',
      );
    const repo = repoUrl.replace(/\.git$/i, '').trim();
    return `https://github.com/${owner}/${repo}.git`;
  }

  private repoUrlWithToken(repoUrl: string): string {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) return repoUrl;
    const meta = this.parseRepoOwnerName(repoUrl);
    if (!meta) return repoUrl;
    return `https://x-access-token:${token}@github.com/${meta.owner}/${meta.repo}.git`;
  }

  private async createPullRequest(
    repoUrl: string,
    branch: string,
    title: string,
  ): Promise<string | null> {
    const token = this.config.get<string>('GITHUB_TOKEN');
    if (!token) return null;
    const meta = this.parseRepoOwnerName(repoUrl);
    if (!meta) return null;
    const res = await fetch(
      `https://api.github.com/repos/${meta.owner}/${meta.repo}/pulls`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title || `AI: ${branch}`,
          head: branch,
          base: 'main',
          body: 'Created by Zenlocal AI',
        }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { html_url?: string };
    return data.html_url ?? null;
  }

  /** Optional callback to stream step-by-step messages to the client */
  async runTask(
    dto: CreateTaskDto,
    userId: string,
    onStep?: (msg: { type: 'step'; message: string }) => void,
  ): Promise<{
    task_id: string;
    branch: string;
    pr_url: string | null;
    message: string;
  }> {
    const step = (message: string) => onStep?.({ type: 'step', message });

    if (dto.continue_on_branch && !dto.branch_name?.trim()) {
      throw new BadRequestException(
        'branch_name is required when continue_on_branch is true.',
      );
    }

    const { id: logId } = await this.promptLogs.log(
      userId,
      dto.prompt,
      dto.branch_name?.trim() ?? null,
    );
    this.logger.log(
      `User ${userId} submitted prompt: "${dto.prompt.slice(0, 80)}${dto.prompt.length > 80 ? '...' : ''}"`,
    );
    step('Starting task…');
    const fullRepoUrl = this.resolveRepoUrl(dto.repo_url ?? '');
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const workspacePath = this.getWorkspacePath(taskId);
    const branchName =
      dto.branch_name?.trim() ||
      `feature/ai-${dto.prompt.slice(0, 30).replace(/\W/g, '-').toLowerCase()}`;

    const continueOnBranch = !!dto.continue_on_branch;
    if (continueOnBranch) {
      step(`Using existing branch: ${branchName}`);
    } else {
      step(`Creating branch: ${branchName}`);
    }

    await fs.mkdir(path.join(process.cwd(), WORKSPACES_DIR), {
      recursive: true,
    });
    const git = simpleGit();
    const cloneUrl = this.repoUrlWithToken(fullRepoUrl);

    step('Cloning repository…');
    if (continueOnBranch) {
      await git.clone(cloneUrl, workspacePath, [
        '--depth',
        '1',
        '--branch',
        branchName,
      ]);
    } else {
      await git.clone(cloneUrl, workspacePath, ['--depth', '1']);
    }
    const repo = simpleGit(workspacePath);
    await repo.remote(['set-url', 'origin', cloneUrl]);
    if (!continueOnBranch) {
      await repo.checkoutLocalBranch(branchName);
    }

    const projectDir = dto.project ?? 'backend';
    const projectRoot = path.join(workspacePath, projectDir);
    try {
      await fs.access(projectRoot);
    } catch {
      await fs
        .rm(workspacePath, { recursive: true, force: true })
        .catch(() => {});
      throw new BadRequestException(
        `Project folder "${projectDir}" not found in repo.`,
      );
    }

    step('Generating changes with AI…');
    let edits: FileEdit[] = [];
    try {
      edits = await this.generateEditsWithAI(
        projectRoot,
        dto.prompt,
        dto.ai_provider,
      );
    } catch (e) {
      await fs
        .rm(workspacePath, { recursive: true, force: true })
        .catch(() => {});
      throw e;
    }

    if (edits.length > 0) {
      step(
        `Applying changes to ${edits.length} file(s): ${edits.map((e) => e.path).join(', ')}`,
      );
      await this.applyEdits(projectRoot, edits);
      await repo.add('.');
      await repo.commit(`Applied: ${dto.prompt.slice(0, 80)}`);
      step('Commit created.');
    } else {
      step('AI suggested no changes.');
    }

    if (continueOnBranch) {
      step('Pulling latest from origin…');
      try {
        await repo.pull('origin', branchName, ['--rebase']);
      } catch {
        // No upstream or already up to date; push will set upstream or succeed
      }
    }

    step('Pushing to origin…');
    await repo.push('origin', branchName, ['-u']);
    await this.promptLogs.setBranchCreatedAt(logId);

    step('Creating pull request…');
    const prUrl = await this.createPullRequest(
      fullRepoUrl,
      branchName,
      `AI: ${dto.prompt.slice(0, 60)}`,
    );

    await fs
      .rm(workspacePath, { recursive: true, force: true })
      .catch(() => {});

    if (prUrl) {
      step(`PR created: ${prUrl}`);
    } else {
      step('Branch pushed. You can open a PR manually in the repo.');
    }

    return {
      task_id: taskId,
      branch: branchName,
      pr_url: prUrl,
      message: prUrl
        ? `Branch ${branchName} pushed and PR created.`
        : `Branch ${branchName} pushed. Create PR manually from your repo.`,
    };
  }
}
