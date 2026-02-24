import { Routes } from '@angular/router';

/**
 * Lazy loaded routes:
 * - Login: chunk loaded when navigating to /login
 * - Layout + children (Prompt, Logs, Users): chunk loaded when navigating to /
 */
export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.routes').then((m) => m.LOGIN_ROUTES),
  },
  {
    path: '',
    loadChildren: () =>
      import('./layout/layout.routes').then((m) => m.LAYOUT_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
