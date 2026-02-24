import { Component } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

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

  readonly aiProviders = [
    { value: 'groq', label: 'Groq' },
    { value: 'openai', label: 'OpenAI' },
  ] as const;

  readonly projects = [
    { value: 'backend', label: 'Backend' },
    { value: 'frontend', label: 'Frontend' },
  ] as const;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public auth: AuthService,
  ) {
    this.form = this.fb.nonNullable.group({
      prompt: ['', [Validators.required]],
      branchName: [''],
      aiProvider: ['groq' as 'groq' | 'openai'],
      project: ['backend' as 'backend' | 'frontend'],
    });
  }

  onSubmit() {
    this.error = '';
    this.result = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { prompt, branchName, aiProvider, project } = this.form.getRawValue();
    this.loading = true;
    const body: {
      prompt: string;
      branch_name?: string;
      ai_provider?: string;
      project?: string;
    } = {
      prompt: prompt.trim(),
      ai_provider: aiProvider,
      project,
    };
    if (branchName?.trim()) body.branch_name = branchName.trim();
    this.http
      .post<{
        task_id: string;
        branch: string;
        pr_url: string | null;
        message: string;
      }>(`${environment.apiUrl}/task`, body)
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.form.enable();
          this.result = {
            branch: res.branch,
            pr_url: res.pr_url ?? undefined,
            message: res.message,
          };
        },
        error: (err) => {
          this.loading = false;
          this.form.enable();
          this.error = err.error?.detail ?? 'Request failed';
        },
      });
    this.form.disable();
  }
}
