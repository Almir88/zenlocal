import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

export interface AgentMessage {
  type: 'step' | 'result' | 'error';
  message?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  steps?: string[];
}

@Component({
  selector: 'app-prompt',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './prompt.component.html',
  styleUrl: './prompt.component.scss',
})
export class PromptComponent {
  form: FormGroup;
  loading = false;
  result: { branch?: string; pr_url?: string; message?: string } | null = null;
  error = '';
  agentMessages: AgentMessage[] = [];
  conversation: ConversationMessage[] = [];
  loadingChat = false;
  @ViewChild('agentLog') agentLogRef?: ElementRef<HTMLDivElement>;
  @ViewChild('conversationEnd') conversationEndRef?: ElementRef<HTMLDivElement>;

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

  /** Handles form submit (e.g. Enter); sends chat message. */
  onSubmit(): void {
    this.sendChat();
  }

  sendChat(): void {
    const prompt = this.form.get('prompt')?.value?.trim();
    if (!prompt) {
      this.form.get('prompt')?.markAsTouched();
      return;
    }
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

    const body: {
      prompt: string;
      branch_name?: string;
      continue_on_branch?: boolean;
      ai_provider?: string;
      project?: string;
    } = {
      prompt: prompt.trim(),
      ai_provider: aiProvider,
      project,
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
                this.agentMessages = [
                  ...this.agentMessages,
                  { type: 'error', message: event.message },
                ];
                this.error = event.message ?? 'Request failed';
                const next = [...this.conversation];
                const last = next[assistantIndex];
                if (last && last.role === 'assistant') {
                  next[assistantIndex] = {
                    ...last,
                    content: `Error: ${this.error}`,
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
}
