import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { environment } from '../../../../environments/environment';
import type { UserRow } from './models/user-row.interface';

export type { UserRow } from './models/user-row.interface';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent implements OnInit {
  users: UserRow[] = [];
  loading: boolean = true;
  error: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    this.http.get<UserRow[]>(`${environment.apiUrl}/auth/users`).subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err.error?.message ?? err.error?.detail ?? 'Failed to load users.';
      },
    });
  }
}
