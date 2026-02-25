import { TestBed} from '@angular/core/testing';
import { ComponentFixture, TestBed} from '@angular/core/testing';
import { LayoutComponent } from './layout.component';
describe('LayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutComponent ],
      imports: [Router],
    }).compileComponents();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have Test link', () => {
    const link = component.nativeElement.querySelector('a[routerLink="test"]');
    expect(link).toBeTruthy();
  });
})