import {
  HttpInterceptorFn,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isRefreshUrl =
    req.url.startsWith(environment.apiUrl) && req.url.includes('/auth/refresh');

  if (!isRefreshUrl) {
    const token = auth.getToken();
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }
      if (isRefreshUrl) {
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => err);
      }
      const refresh = auth.getRefreshToken();
      if (!refresh) {
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => err);
      }
      return auth.refreshToken().pipe(
        switchMap((res) => {
          const retry = req.clone({
            setHeaders: { Authorization: `Bearer ${res.access_token}` },
          });
          return next(retry);
        }),
        catchError(() => {
          auth.logout();
          router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
