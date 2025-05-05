import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuovaPeriziaPage } from './nuova-perizia.page';

describe('NuovaPeriziaPage', () => {
  let component: NuovaPeriziaPage;
  let fixture: ComponentFixture<NuovaPeriziaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NuovaPeriziaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
