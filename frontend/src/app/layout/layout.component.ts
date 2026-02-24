import { Component } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  userMenuOpen = false;

  constructor(
    public auth: AuthService,
    public router: Router,
  ) {}

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  get pageTitle(): string {
    const layout = this.router.routerState.snapshot.root.firstChild;
    const child = layout?.firstChild ?? layout;
    return (child?.routeConfig?.data as { title?: string })?.title ?? '';
  }
}
