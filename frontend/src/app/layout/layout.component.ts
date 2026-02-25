import { Component } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

export interface BreadcrumbItem {
  label: string;
  path: string | null;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  userMenuOpen = false;

  private readonly segmentLabels: Record<string, string> = {
    profile: 'Profile',
    prompt: 'Prompt',
    'prompt-logs': 'Logs',
    consumption: 'Consumption',
    users: 'Users',
    add: 'Add user',
    list: 'User list',
  };

  constructor(
    public auth: AuthService,
    public router: Router,
    public theme: ThemeService,
  ) {}

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  get pageTitle(): string {
    const layout = this.router.routerState.snapshot.root.firstChild;
    const child = layout?.firstChild ?? layout;
    return (child?.routeConfig?.data as { title?: string })?.title ?? '';
  }

  get breadcrumbs(): BreadcrumbItem[] {
    const url = this.router.url;
    if (!url || url === '/') return [{ label: 'Prompt', path: '/prompt' }];
    const segments = url.replace(/^\//, '').split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    let path = '';
    for (let i = 0; i < segments.length; i++) {
      path += (path ? '/' : '') + segments[i];
      const label = this.segmentLabels[segments[i]] ?? segments[i];
      items.push({
        label,
        path: i < segments.length - 1 ? path : null,
      });
    }
    if (items.length === 0) items.push({ label: 'Prompt', path: '/prompt' });
    return items;
  }
}
