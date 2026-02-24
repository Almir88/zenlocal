import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'zenlocal_token';
  private userKey = 'zenlocal_user';

  private token = signal<string | null>(this.getStoredToken());
  private user = signal<User | null>(this.getStoredUser());

  isLoggedIn = computed(() => !!this.token());
  currentUser = computed(() => this.user());
  isAdmin = computed(() => this.user()?.role === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  login(email: string, password: string) {
    return this.http.post<{ access_token: string; user: User }>(
      `${environment.apiUrl}/auth/login`,
      { email, password },
    );
  }

  setSession(res: { access_token: string; user: User }) {
    localStorage.setItem(this.tokenKey, res.access_token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this.token.set(res.access_token);
    this.user.set(res.user);
    this.router.navigate(['/']);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }
}
