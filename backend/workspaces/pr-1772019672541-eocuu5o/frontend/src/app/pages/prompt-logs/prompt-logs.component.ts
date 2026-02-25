import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../environments/environment';
import type { PromptLogRow } from './models/prompt-log-row.interface';

@Component({
  selector: 'app-prompt-logs',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './prompt-logs.component.html',
  styleUrl: './prompt-logs.component.scss',
})
export class PromptLogsComponent implements OnInit {
  logs: PromptLogRow[] = [];
  loading: boolean = true;
  error: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.http
      .get<PromptLogRow[]>(`${environment.apiUrl}/auth/prompt-logs`)
      .subscribe({
        next: (data) => {
          this.logs = data;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail ?? 'Failed to load logs';
        },
      });
  }
}
