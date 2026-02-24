import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { LayoutComponent } from './layout.component';

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LayoutComponent ]
    });
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have new sidebar item', () => {
    const sidebarItems = fixture.nativeElement.querySelectorAll('li');
    expect(sidebarItems.length).toBeGreaterThanOrEqual(1);
    const newSidebarItem = sidebarItems[sidebarItems.length - 1];
    expect(newSidebarItem.textContent).toContain('test');
  });
});