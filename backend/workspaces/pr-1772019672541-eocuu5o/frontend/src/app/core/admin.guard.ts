import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';

export function adminGuard(
  _route: ActivatedRouteSnapshot,
  _state: RouterStateSnapshot,
): boolean {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  router.navigate(['/']);
  return false;
}
