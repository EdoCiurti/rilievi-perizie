import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-nuova-perizia',
  templateUrl: './nuova-perizia.page.html',
  styleUrls: ['./nuova-perizia.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class NuovaPeriziaPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
