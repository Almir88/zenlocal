import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import type {
  LoginResponse,
  RefreshResponse,
  User,
} from './interfaces/auth.interface';

export type {
  LoginResponse,
  RefreshResponse,
  User,
} from './interfaces/auth.interface';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey: string = 'zenlocal_token';
  private readonly userKey: string = 'zenlocal_user';
  private readonly refreshTokenKey: string = 'zenlocal_refresh_token';

  private token = signal<string | null>(this.getStoredToken());
  private user = signal<User | null>(this.getStoredUser());

  readonly isLoggedIn = computed<boolean>(() => !!this.token());
  readonly currentUser = computed<User | null>(() => this.user());
  readonly isAdmin = computed<boolean>(() => this.user()?.role === 'admin');

  private refreshInFlight: Observable<RefreshResponse> | null = null;

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

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {
      email,
      password,
    });
  }

  setSession(res: LoginResponse): void {
    localStorage.setItem(this.tokenKey, res.access_token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this.token.set(res.access_token);
    this.user.set(res.user);
    if (res.refresh_token) {
      localStorage.setItem(this.refreshTokenKey, res.refresh_token);
    }
    this.router.navigate(['/']);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.refreshTokenKey);
    this.token.set(null);
    this.user.set(null);
    this.refreshInFlight = null;
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.token();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  /** Refreshes access token. Shared in-flight so multiple 401s trigger one refresh. */
  refreshToken(): Observable<RefreshResponse> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      return throwError(() => new Error('No refresh token'));
    }
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.http
        .post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, {
          refresh_token: refresh,
        })
        .pipe(
          tap((res) => {
            localStorage.setItem(this.tokenKey, res.access_token);
            this.token.set(res.access_token);
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
          catchError((err) => {
            this.refreshInFlight = null;
            return throwError(() => err);
          }),
        );
    }
    return this.refreshInFlight;
  }
}
