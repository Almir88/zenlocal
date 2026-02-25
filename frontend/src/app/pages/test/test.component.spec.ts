import { TestBed } from '@angular/core/testing';
import { TestComponent } from './test.component';

test('should create', () => {
  expect(component).toBeTruthy();
});
test('should display the test component', () => {
  expect(component).toBeTruthy();
  const CompiledTestComponent: any = fixture.debugElement.query(By.css('h1')).nativeElement;
  expect(CompiledTestComponent.textContent).toBe('test component');
});