import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';
import type {
  AgentMessage,
  AppliedFileDiff,
  ConversationMessage,
  DiffLine,
  ImplementResult,
  RepoFileItem,
  TestsAndPrResult,
} from './models/prompt.models';

export type {
  AgentMessage,
  ConversationMessage,
  RepoFileItem,
} from './models/prompt.models';

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.scss',
})
export class PromptComponent implements OnInit, OnDestroy {
  form: FormGroup;
  loading: boolean = false;
  result: ImplementResult | null = null;
  error: string = '';
  showPromptRequired: boolean = false;
  agentMessages: AgentMessage[] = [];
  conversation: ConversationMessage[] = [];
  loadingChat: boolean = false;
  branches: string[] = [];
  loadBranchesLoading: boolean = false;
  defaultBranch: string | null = null;
  projectFiles: RepoFileItem[] = [];
  projectFilesLoading: boolean = false;
  appliedFiles: string[] = [];
  appliedDiffs: AppliedFileDiff[] = [];
  implementBranch: string | null = null;
  loadingTestsAndPr: boolean = false;
  testsAndPrResult: TestsAndPrResult | null = null;
  private readonly destroy$ = new Subject<void>();

  @ViewChild('agentLog') agentLogRef?: ElementRef<HTMLDivElement>;
  @ViewChild('conversationEnd') conversationEndRef?: ElementRef<HTMLDivElement>;
  @ViewChild('appliedChangesSection')
  appliedChangesSectionRef?: ElementRef<HTMLElement>;

  readonly aiProviders = [
    { value: 'groq', label: 'Groq' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'sudodog', label: 'SudoDog' },
    { value: 'langchain', label: 'LangChain' },
    { value: 'crewai', label: 'CrewAI' },
    { value: 'autogen', label: 'AutoGen' },
    { value: 'autogpt', label: 'AutoGPT' },
    { value: 'botpress', label: 'Botpress' },
    { value: 'rasa', label: 'Rasa' },
  ] as const;

  readonly projects = [
    { value: 'backend', label: 'Backend' },
    { value: 'frontend', label: 'Frontend' },
  ] as const;

  constructor(
    private fb: FormBuilder,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.nonNullable.group({
      prompt: ['', [Validators.required]],
      branchName: [''],
      continueOnBranch: [false],
      aiProvider: [
        'groq' as
          | 'groq'
          | 'openai'
          | 'sudodog'
          | 'langchain'
          | 'crewai'
          | 'autogen'
          | 'autogpt'
          | 'botpress'
          | 'rasa',
      ],
      project: ['backend' as 'backend' | 'frontend'],
    });
  }

  ngOnInit(): void {
    this.loadProjectFiles();
    this.form
      .get('project')
      ?.valueChanges?.pipe(takeUntil(this.destroy$))
      ?.subscribe(() => this.loadProjectFiles());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProjectFiles(): void {
    const project = this.form.get('project')?.value as 'backend' | 'frontend';
    if (!project) {
      this.projectFiles = [];
      return;
    }
    this.projectFilesLoading = true;
    this.projectFiles = [];
    const token = this.auth.getToken();
    const params = new URLSearchParams({ project });
    fetch(`${environment.apiUrl}/task/repo-files?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { message?: string }).message ??
              'Failed to load project structure',
          );
        }
        this.projectFiles = Array.isArray(data) ? data : [];
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.projectFiles = [];
        this.cdr.detectChanges();
      })
      .finally(() => {
        this.projectFilesLoading = false;
        this.cdr.detectChanges();
      });
  }

  loadBranches(): void {
    this.loadBranchesLoading = true;
    const token = this.auth.getToken();
    fetch(`${environment.apiUrl}/task/branches`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            (data as { message?: string }).message ?? 'Failed to load branches',
          );
        const { branches, defaultBranch } = data as {
          branches: string[];
          defaultBranch?: string;
        };
        this.branches = Array.isArray(branches) ? branches : [];
        this.defaultBranch = defaultBranch ?? null;
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.branches = [];
        this.defaultBranch = null;
        this.cdr.detectChanges();
      })
      .finally(() => {
        this.loadBranchesLoading = false;
        this.cdr.detectChanges();
      });
  }

  /** Handles form submit (e.g. Enter); sends chat message. */
  onSubmit(): void {
    this.sendChat();
  }

  sendChat(): void {
    const prompt = this.form.get('prompt')?.value?.trim();
    if (!prompt) {
      this.showPromptRequired = true;
      return;
    }
    this.showPromptRequired = false;
    this.error = '';
    this.conversation = [
      ...this.conversation,
      { role: 'user', content: prompt },
    ];
    this.form.patchValue({ prompt: '' });
    this.loadingChat = true;
    this.cdr.detectChanges();
    this.scrollConversationToEnd();

    const token = this.auth.getToken();
    const aiProvider = this.form.get('aiProvider')?.value;
    const project = this.form.get('project')?.value;

    fetch(`${environment.apiUrl}/task/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: prompt,
        ai_provider: aiProvider,
        project: project ?? undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.message ?? data?.detail ?? 'Chat failed');
        }
        this.conversation = [
          ...this.conversation,
          { role: 'assistant', content: (data as { reply: string }).reply },
        ];
        this.cdr.detectChanges();
        this.scrollConversationToEnd();
      })
      .catch((err: Error) => {
        this.conversation = [
          ...this.conversation,
          { role: 'assistant', content: `Error: ${err.message}` },
        ];
        this.error = err.message;
        this.cdr.detectChanges();
        this.scrollConversationToEnd();
      })
      .finally(() => {
        this.loadingChat = false;
        this.cdr.detectChanges();
      });
  }

  runImplement(): void {
    this.error = '';
    this.result = null;
    this.agentMessages = [];
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { prompt, branchName, continueOnBranch, aiProvider, project } =
      this.form.getRawValue();
    if (continueOnBranch && !branchName?.trim()) {
      this.error =
        'Branch name is required when continuing on the same branch.';
      return;
    }
    this.conversation = [
      ...this.conversation,
      { role: 'user', content: prompt.trim() },
    ];
    this.loading = true;
    this.cdr.detectChanges();
    this.scrollConversationToEnd();
    this.scrollToAppliedChanges();

    const body: {
      prompt: string;
      branch_name?: string;
      continue_on_branch?: boolean;
      ai_provider?: string;
      project?: string;
      create_pr?: boolean;
    } = {
      prompt: prompt.trim(),
      ai_provider: aiProvider,
      project,
      create_pr: false,
    };
    if (branchName?.trim()) body.branch_name = branchName.trim();
    if (continueOnBranch) body.continue_on_branch = true;

    const token = this.auth.getToken();
    this.form.disable();

    const assistantEntry: ConversationMessage = {
      role: 'assistant',
      content: '',
      steps: [],
    };
    this.conversation = [...this.conversation, assistantEntry];
    const assistantIndex = this.conversation.length - 1;

    fetch(`${environment.apiUrl}/task/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message ?? err?.detail ?? 'Request failed');
        }
        const reader = res.body?.getReader();
        if (!reader) {
          this.loading = false;
          this.form.enable();
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed) as {
                type: string;
                message?: string;
                branch?: string;
                pr_url?: string | null;
                task_id?: string;
                applied_files?: string[];
                applied_diffs?: { path: string; diff: string }[];
              };
              if (event.type === 'step' && event.message) {
                this.agentMessages = [
                  ...this.agentMessages,
                  { type: 'step', message: event.message },
                ];
                const next = [...this.conversation];
                const last = next[assistantIndex];
                if (last && last.role === 'assistant' && last.steps) {
                  next[assistantIndex] = {
                    ...last,
                    steps: [...last.steps, event.message],
                  };
                  this.conversation = next;
                }
                this.cdr.detectChanges();
                setTimeout(() => this.scrollLogToBottom(), 0);
                this.scrollConversationToEnd();
              } else if (event.type === 'result') {
                this.agentMessages = [
                  ...this.agentMessages,
                  { type: 'result', message: event.message },
                ];
                this.result = {
                  branch: event.branch,
                  pr_url: event.pr_url ?? undefined,
                  message: event.message,
                };
                this.appliedFiles = Array.isArray(event.applied_files)
                  ? event.applied_files
                  : [];
                this.appliedDiffs = Array.isArray(event.applied_diffs)
                  ? event.applied_diffs
                  : [];
                if (event.branch) this.implementBranch = event.branch;
                this.testsAndPrResult = null;
                const next = [...this.conversation];
                const last = next[assistantIndex];
                if (last && last.role === 'assistant') {
                  next[assistantIndex] = {
                    ...last,
                    content: event.message ?? '',
                  };
                  this.conversation = next;
                }
                if (event.branch) {
                  this.form.patchValue({
                    branchName: event.branch,
                    continueOnBranch: true,
                  });
                }
                this.cdr.detectChanges();
                setTimeout(() => this.scrollLogToBottom(), 0);
                this.scrollConversationToEnd();
              } else if (event.type === 'error') {
                const errMsg = event.message ?? 'Request failed';
                const next = [...this.conversation];
                const last = next[assistantIndex];
                if (last && last.role === 'assistant') {
                  next[assistantIndex] = {
                    ...last,
                    content: errMsg,
                  };
                  this.conversation = next;
                }
                this.cdr.detectChanges();
                this.scrollConversationToEnd();
              }
            } catch {
              /* ignore malformed lines */
            }
          }
        }
        this.loading = false;
        this.form.enable();
      })
      .catch((err: Error) => {
        this.loading = false;
        this.form.enable();
        this.error = err.message ?? 'Request failed';
        const next = [...this.conversation];
        const last = next[assistantIndex];
        if (last && last.role === 'assistant') {
          next[assistantIndex] = { ...last, content: `Error: ${err.message}` };
          this.conversation = next;
        }
        this.cdr.detectChanges();
      });
  }

  getDiffForPath(filePath: string): string {
    return this.appliedDiffs.find((d) => d.path === filePath)?.diff ?? '';
  }

  getDiffLines(filePath: string): DiffLine[] {
    const diff = this.getDiffForPath(filePath);
    if (!diff) return [];
    return diff.split(/\n/).map((line) => {
      if (line.startsWith('+') && !line.startsWith('+++'))
        return { line, type: 'add' as const };
      if (line.startsWith('-') && !line.startsWith('---'))
        return { line, type: 'del' as const };
      return { line, type: 'ctx' as const };
    });
  }

  runTestsAndCreatePr(): void {
    if (!this.implementBranch) return;
    this.testsAndPrResult = null;
    this.loadingTestsAndPr = true;
    this.error = '';
    this.cdr.detectChanges();
    const project = this.form.get('project')?.value as 'backend' | 'frontend';
    const token = this.auth.getToken();
    fetch(`${environment.apiUrl}/task/run-tests-and-create-pr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        branch_name: this.implementBranch,
        project: project ?? 'backend',
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (data as { message?: string }).message ?? 'Request failed',
          );
        }
        this.testsAndPrResult = data as TestsAndPrResult;
        this.cdr.detectChanges();
      })
      .catch((err: Error) => {
        this.error = err.message;
        this.cdr.detectChanges();
      })
      .finally(() => {
        this.loadingTestsAndPr = false;
        this.cdr.detectChanges();
      });
  }

  private scrollLogToBottom(): void {
    const el = this.agentLogRef?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private scrollConversationToEnd(): void {
    this.conversationEndRef?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }

  private scrollToAppliedChanges(): void {
    this.appliedChangesSectionRef?.nativeElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
