import { Component, Input, OnInit } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-viewer',
  template: `
    <ion-header>
      <ion-toolbar color="dark">
        <ion-buttons slot="start">
          <ion-button (click)="closeModal()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ indiceAttuale + 1 }} / {{ immagini.length }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content [fullscreen]="true" class="ion-padding">
      <div class="slideshow">
        <div class="image-container">
          <img [src]="immagineAttuale?.url" alt="Immagine perizia" class="immagine-fullscreen">
        </div>
        <div class="image-comment" *ngIf="immagineAttuale?.commento">
          <p>{{ immagineAttuale.commento }}</p>
        </div>
      </div>
      
      <div class="navigation-buttons">
        <ion-button (click)="prevImage()" [disabled]="indiceAttuale === 0" fill="clear" color="light">
          <ion-icon name="chevron-back-outline" slot="icon-only"></ion-icon>
        </ion-button>
        <ion-button (click)="nextImage()" [disabled]="indiceAttuale >= immagini.length - 1" fill="clear" color="light">
          <ion-icon name="chevron-forward-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .slideshow {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: center;
      align-items: center;
    }
    
    .image-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .immagine-fullscreen {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
    }
    
    .image-comment {
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px;
      margin-top: 10px;
      border-radius: 5px;
      width: 100%;
      text-align: center;
    }
    
    .navigation-buttons {
      position: absolute;
      bottom: 20px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 20px;
    }
    
    ion-content {
      --background: #000000;
    }
  `],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class ImageViewerComponent implements OnInit {
  @Input() immagini: any[] = [];
  @Input() indiceIniziale = 0;
  indiceAttuale = 0;
  immagineAttuale: any;

  constructor(private modalController: ModalController) {}

  ngOnInit() {
    this.indiceAttuale = this.indiceIniziale;
    this.immagineAttuale = this.immagini[this.indiceAttuale];
  }

  closeModal() {
    this.modalController.dismiss();
  }

  prevImage() {
    if (this.indiceAttuale > 0) {
      this.indiceAttuale--;
      this.immagineAttuale = this.immagini[this.indiceAttuale];
    }
  }

  nextImage() {
    if (this.indiceAttuale < this.immagini.length - 1) {
      this.indiceAttuale++;
      this.immagineAttuale = this.immagini[this.indiceAttuale];
    }
  }
}