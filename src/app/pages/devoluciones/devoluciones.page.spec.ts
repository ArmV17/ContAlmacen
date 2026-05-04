import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DevolucionesPage } from './devoluciones.page';

describe('DevolucionesPage', () => {
  let component: DevolucionesPage;
  let fixture: ComponentFixture<DevolucionesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DevolucionesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
