import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LayoutComponent } from './layout.component';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  const mockRouter = {
    routerState: { snapshot: { root: { firstChild: null } } },
  };

  const mockAuth = {
    isAdmin: () => false,
    currentUser: () => ({
      name: 'Test',
      email: 'test@test.com',
      role: 'user' as const,
    }),
    logout: () => {},
  };

  const mockTheme = {
    isDark: () => false,
    toggle: () => {},
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuth },
        { provide: ThemeService, useValue: mockTheme },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close user menu', () => {
    expect(component.userMenuOpen).toBe(false);
    component.toggleUserMenu();
    expect(component.userMenuOpen).toBe(true);
    component.closeUserMenu();
    expect(component.userMenuOpen).toBe(false);
  });
});
