import { TestBed } from '@angular/core/testing';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: []
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AdminGuard);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should redirect when no userId', () => {
    const fixture = TestBed.createComponent(AdminGuard);
    const app = fixture.componentInstance;
    spyOn(app.router, 'parseUrl').and.returnValue({} as any);
    const route = { routeConfig: {} } as any;
    const state = { url: '' } as any;
    const result = app.canActivate(route, state);
    expect(result).toBeInstanceOf(Object);  // TODO: Improve type checking
  });
});