import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-dettaglio-perizia',
  templateUrl: './dettaglio-perizia.page.html',
  styleUrls: ['./dettaglio-perizia.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class DettaglioPeriziaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
