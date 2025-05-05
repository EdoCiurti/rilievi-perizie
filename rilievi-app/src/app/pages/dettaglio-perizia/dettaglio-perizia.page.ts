import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertController, ModalController, ToastController, IonicModule } from '@ionic/angular';
import { PerizieService } from '../../services/perizie.service';
import { CommonModule } from '@angular/common';
import { Share } from '@capacitor/share';
import { ImageViewerComponent } from '/Users/edocu/Desktop/rilievi-e-perizie/rilievi-perizie/rilievi-app/src/app/components/image-viewer/image-viewer.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-dettaglio-perizia',
  templateUrl: './dettaglio-perizia.page.html',
  styleUrls: ['./dettaglio-perizia.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterLink]
})
export class DettaglioPeriziaPage implements OnInit {
  periziaId!: string;
  perizia: any = null;
  isLoading = false;
  map: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private perizieService: PerizieService,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.periziaId = id;
      this.caricaPerizia();
    } else {
      this.presentErrorToast();
      this.router.navigate(['/perizie']);
    }
  }

  ionViewDidEnter() {
    if (this.perizia?.coordinate && this.perizia.coordinate.length === 2) {
      setTimeout(() => {
        this.initMap();
      }, 300);
    }
  }

  caricaPerizia() {
    this.isLoading = true;
    this.perizieService.getPerizia(this.periziaId).subscribe(
      (data) => {
        this.perizia = data;
        this.isLoading = false;
        
        if (this.perizia?.coordinate && this.perizia.coordinate.length === 2) {
          setTimeout(() => {
            this.initMap();
          }, 300);
        }
      },
      (error) => {
        console.error('Errore caricamento perizia', error);
        this.isLoading = false;
        this.presentErrorToast();
      }
    );
  }

  initMap() {
    if (!this.perizia?.coordinate || this.perizia.coordinate.length !== 2) return;
    
    // Distruggi la mappa esistente se presente
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    // Crea nuova mappa
    this.map = L.map('map').setView([this.perizia.coordinate[0], this.perizia.coordinate[1]], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
    
    const marker = L.marker([this.perizia.coordinate[0], this.perizia.coordinate[1]]).addTo(this.map);
    marker.bindPopup(`<b>${this.perizia.cliente || 'Perizia'}</b><br>${this.perizia.indirizzo || ''}`).openPopup();
  }

  getColorByStato(stato: string): string {
    switch (stato?.toLowerCase()) {
      case 'completata':
        return 'success';
      case 'in corso':
        return 'primary';
      case 'in attesa':
        return 'warning';
      default:
        return 'medium';
    }
  }

  async visualizzaImmagine(index: number) {
    if (!this.perizia?.immagini || index >= this.perizia.immagini.length) return;
    
    const modal = await this.modalController.create({
      component: ImageViewerComponent,
      componentProps: {
        immagini: this.perizia.immagini,
        indiceIniziale: index
      },
      cssClass: 'fullscreen-modal'
    });
    
    return await modal.present();
  }

  async modificaPerizia() {
    const alert = await this.alertController.create({
      header: 'Modifica stato',
      inputs: [
        {
          name: 'stato',
          type: 'radio',
          label: 'In attesa',
          value: 'In attesa',
          checked: this.perizia.stato === 'In attesa'
        },
        {
          name: 'stato',
          type: 'radio',
          label: 'In corso',
          value: 'In corso',
          checked: this.perizia.stato === 'In corso'
        },
        {
          name: 'stato',
          type: 'radio',
          label: 'Completata',
          value: 'Completata',
          checked: this.perizia.stato === 'Completata'
        }
      ],
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Aggiorna',
          handler: (data) => {
            if (data) {
              this.aggiornaStatoPerizia(data);
            }
          }
        }
      ]
    });
    
    await alert.present();
  }

  async aggiornaStatoPerizia(stato: string) {
    try {
      await this.perizieService.aggiornaStatoPerizia(this.periziaId, stato);
      this.perizia.stato = stato;
      
      const toast = await this.toastController.create({
        message: 'Stato perizia aggiornato con successo',
        duration: 2000,
        color: 'success'
      });
      toast.present();
    } catch (error) {
      console.error('Errore aggiornamento stato', error);
      const toast = await this.toastController.create({
        message: 'Errore durante l\'aggiornamento dello stato',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  async condividiPerizia() {
    if (!this.perizia) return;
    
    const infoGenerali = `
Cliente: ${this.perizia.cliente || 'Non specificato'}
Indirizzo: ${this.perizia.indirizzo || 'Non specificato'}
Stato: ${this.perizia.stato}
Descrizione: ${this.perizia.descrizione}
    `.trim();
    
    try {
      await Share.share({
        title: `Perizia: ${this.perizia.cliente || 'Perizia'} - ${this.perizia.indirizzo || ''}`,
        text: infoGenerali,
        url: `https://rilievi-perizie.onrender.com/perizie/${this.periziaId}`,
        dialogTitle: 'Condividi perizia'
      });
    } catch (error) {
      console.error('Errore condivisione', error);
    }
  }

  async presentErrorToast() {
    const toast = await this.toastController.create({
      message: 'Errore nel caricamento della perizia',
      duration: 3000,
      color: 'danger'
    });
    toast.present();
  }
}