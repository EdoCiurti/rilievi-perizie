import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DettaglioPeriziaPage } from './dettaglio-perizia.page';

describe('DettaglioPeriziaPage', () => {
  let component: DettaglioPeriziaPage;
  let fixture: ComponentFixture<DettaglioPeriziaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DettaglioPeriziaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
