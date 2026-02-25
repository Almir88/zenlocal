import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY: string = 'zenlocal_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly dark = signal<boolean>(this.getStored());

  readonly isDark = computed<boolean>(() => this.dark());

  constructor() {
    this.apply(this.dark());
  }

  private getStored(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return false;
  }

  private apply(dark: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(
      'data-theme',
      dark ? 'dark' : 'light',
    );
  }

  setDark(value: boolean): void {
    this.dark.set(value);
    this.apply(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light');
    } catch {}
  }

  toggle(): void {
    this.setDark(!this.dark());
  }
}
