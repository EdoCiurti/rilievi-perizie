import { TestBed } from '@angular/core/testing';

import { PerizieService } from './perizie.service';

describe('PerizieService', () => {
  let service: PerizieService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PerizieService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
