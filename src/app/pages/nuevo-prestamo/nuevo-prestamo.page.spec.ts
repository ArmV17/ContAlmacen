import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoPrestamoPage } from './nuevo-prestamo.page';

describe('NuevoPrestamoPage', () => {
  let component: NuevoPrestamoPage;
  let fixture: ComponentFixture<NuevoPrestamoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuevoPrestamoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
