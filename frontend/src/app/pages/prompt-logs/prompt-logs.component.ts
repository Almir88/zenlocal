import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { downloadCsv } from '../../core/export-csv';
import type { PromptLogRow } from './models/prompt-log-row.interface';

interface UserOption {
  id: string;
  email: string;
  name: string;
  role: string;
}

@Component({
  selector: 'app-prompt-logs',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './prompt-logs.component.html',
  styleUrl: './prompt-logs.component.scss',
})
export class PromptLogsComponent implements OnInit {
  logs: PromptLogRow[] = [];
  total = 0;
  loading = true;
  error = '';

  page = 1;
  limit = 20;
  userId = '';
  dateFrom = '';
  dateTo = '';
  branchName = '';

  userOptions: UserOption[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadLogs();
  }

  loadUsers(): void {
    this.http
      .get<{ items: UserOption[] }>(`${environment.apiUrl}/auth/users`)
      .subscribe({
        next: (res) => {
          this.userOptions = res.items ?? [];
        },
      });
  }

  loadLogs(): void {
    this.loading = true;
    this.error = '';
    const params = new URLSearchParams();
    params.set('page', String(this.page));
    params.set('limit', String(this.limit));
    if (this.userId) params.set('userId', this.userId);
    if (this.dateFrom) params.set('dateFrom', this.dateFrom);
    if (this.dateTo) params.set('dateTo', this.dateTo);
    if (this.branchName.trim())
      params.set('branchName', this.branchName.trim());

    this.http
      .get<{
        items: PromptLogRow[];
        total: number;
      }>(`${environment.apiUrl}/auth/prompt-logs?${params}`)
      .subscribe({
        next: (data) => {
          this.logs = data.items ?? [];
          this.total = data.total ?? 0;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 403) {
            this.error = 'Access denied. Only admins can view prompt logs.';
            return;
          }
          const msg = err.error?.message ?? err.error?.detail ?? err.message;
          this.error = typeof msg === 'string' ? msg : 'Failed to load logs';
        },
      });
  }

  onFilter(): void {
    this.page = 1;
    this.loadLogs();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadLogs();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  selectedLog: PromptLogRow | null = null;

  openDetail(log: PromptLogRow): void {
    this.selectedLog = log;
  }

  closeDetail(): void {
    this.selectedLog = null;
  }

  exportCsv(): void {
    const headers = [
      'User',
      'Email',
      'Prompt',
      'Branch',
      'Created at',
      'Branch created at',
    ];
    const rows = this.logs.map((log) => [
      log.user?.name ?? '',
      log.user?.email ?? '',
      log.prompt ?? '',
      log.branchName ?? '',
      log.createdAt ?? '',
      log.branchCreatedAt ?? '',
    ]);
    downloadCsv(
      `prompt-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
  }
}
