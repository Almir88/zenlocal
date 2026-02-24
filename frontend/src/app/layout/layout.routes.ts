import { Routes } from '@angular/router';
import { authGuard } from '../core/auth.guard';
import { adminGuard } from '../core/admin.guard';

export const LAYOUT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layout.component').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'prompt',
      },
      {
        path: 'prompt',
        loadComponent: () =>
          import('../pages/prompt/prompt.component').then(
            (m) => m.PromptComponent,
          ),
        data: { title: 'Prompt' },
      },
      {
        path: 'prompt-logs',
        loadComponent: () =>
          import('../pages/prompt-logs/prompt-logs.component').then(
            (m) => m.PromptLogsComponent,
          ),
        canActivate: [adminGuard],
        data: { title: 'Prompt logs' },
      },
      {
        path: 'consumption',
        loadComponent: () =>
          import('../pages/consumption/consumption.component').then(
            (m) => m.ConsumptionComponent,
          ),
        canActivate: [adminGuard],
        data: { title: 'Consumption' },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../pages/users/users.component').then(
            (m) => m.UsersComponent,
          ),
        canActivate: [adminGuard],
        data: { title: 'Users' },
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'add',
          },
          {
            path: 'add',
            loadComponent: () =>
              import('../pages/add-user/add-user.component').then(
                (m) => m.AddUserComponent,
              ),
          },
          {
            path: 'list',
            loadComponent: () =>
              import('../pages/users/user-list/user-list.component').then(
                (m) => m.UserListComponent,
              ),
          },
        ],
      },
    ],
  },
];
