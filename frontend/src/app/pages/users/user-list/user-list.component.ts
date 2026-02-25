import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { downloadCsv } from '../../../core/export-csv';
import type { UserRow } from './models/user-row.interface';

export type { UserRow } from './models/user-row.interface';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  users: UserRow[] = [];
  total = 0;
  loading = true;
  error = '';

  page = 1;
  limit = 500;
  search = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    const params = new URLSearchParams();
    params.set('page', String(this.page));
    params.set('limit', String(this.limit));
    if (this.search.trim()) params.set('search', this.search.trim());

    this.http
      .get<{
        items: UserRow[];
        total: number;
      }>(`${environment.apiUrl}/auth/users?${params}`)
      .subscribe({
        next: (data) => {
          this.users = data.items ?? [];
          this.total = data.total ?? 0;
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 403) {
            this.error = 'Access denied. Only admins can view users.';
            return;
          }
          const msg = err.error?.message ?? err.error?.detail ?? err.message;
          this.error = typeof msg === 'string' ? msg : 'Failed to load users.';
        },
      });
  }

  onSearch(): void {
    this.page = 1;
    this.loadUsers();
  }

  goToPage(p: number): void {
    this.page = p;
    this.loadUsers();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.limit));
  }

  exportCsv(): void {
    const headers = ['Name', 'Email', 'Role', 'Added'];
    const rows = this.users.map((u) => [
      u.name,
      u.email,
      u.role,
      u.createdAt ?? '',
    ]);
    downloadCsv(
      `users-${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    );
  }
}
