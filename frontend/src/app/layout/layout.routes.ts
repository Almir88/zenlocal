import { Routes } from '@angular/router';
declare const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
  },
  {
    path: ':route',
    component: LayoutComponent,
  },
];
declare const layoutRoutes = routes;
