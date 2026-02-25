import { Routes } from '@angular/router';
import { adminGuard } from '../../core/admin.guard';

export const ADD_USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./add-user.component').then((m) => m.AddUserComponent),
    canActivate: [adminGuard],
    data: { title: 'Add User' },
  },
];
