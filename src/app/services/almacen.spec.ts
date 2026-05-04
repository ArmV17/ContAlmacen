import { TestBed } from '@angular/core/testing';

import { Almacen } from './almacen';

describe('Almacen', () => {
  let service: Almacen;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Almacen);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
