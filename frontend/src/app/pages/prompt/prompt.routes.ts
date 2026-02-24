import { Routes } from '@angular/router';
import { adminGuard } from '../../core/admin.guard';

export const PROMPT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./prompt.component').then((m) => m.PromptComponent),
    canActivate: [adminGuard],
    data: { title: 'Prompt' },
  },
];
