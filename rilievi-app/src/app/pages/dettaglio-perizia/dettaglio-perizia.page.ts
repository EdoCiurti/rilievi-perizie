import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlertController, ModalController, ToastController, IonicModule } from '@ionic/angular';
import { PerizieService } from '../../services/perizie.service';
import { CommonModule } from '@angular/common';
import { Share } from '@capacitor/share';
import { ImageViewerComponent } from '../../components/image-viewer/image-viewer.component';
import { ModificaPeriziaComponent } from '../../components/modifica-perizia/modifica-perizia.component';
import * as L from 'leaflet';
import { Injectable } from '@angular/core';

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
    
    // Usa getPeriziaById invece di getPerizie con parametro
    this.perizieService.getPeriziaById(this.periziaId).subscribe(
      (perizia: any) => { // Ricevi direttamente l'oggetto perizia, non un array
        this.perizia = perizia;
        this.isLoading = false;
        
        if (this.perizia?.coordinate && this.perizia.coordinate.length === 2) {
          setTimeout(() => {
            this.initMap();
          }, 300);
        }
      },
      (error: any) => {
        console.error('Errore caricamento perizia', error);
        this.isLoading = false;
        this.presentErrorToast();
      }
    );
  }

  initMap() {
    if (!this.perizia?.coordinate || this.perizia.coordinate.length !== 2) {
      console.log('Coordinate non valide:', this.perizia?.coordinate);
      return;
    }
    
    // Assicurati che 'map' sia un elemento esistente nel DOM
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento mappa non trovato nel DOM');
      return;
    }
    
    // Distruggi la mappa esistente se presente
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    console.log('Inizializzazione mappa con coordinate:', this.perizia.coordinate);
    
    // Crea nuova mappa
    try {
      this.map = L.map('map').setView([this.perizia.coordinate[0], this.perizia.coordinate[1]], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(this.map);
      
      // Aggiungi marker con popup
      const marker = L.marker([this.perizia.coordinate[0], this.perizia.coordinate[1]])
        .addTo(this.map)
        .bindPopup(`<b>${this.perizia.cliente}</b><br>${this.perizia.indirizzo}`)
        .openPopup();
        
      // Invalida la dimensione della mappa per forzare il render
      setTimeout(() => {
        this.map.invalidateSize();
      }, 300);
    } catch (error) {
      console.error('Errore inizializzazione mappa:', error);
    }
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

  getImageUrl(img: any): string {
    // Se l'immagine è già un URL completo
    if (img.url && img.url.startsWith('http')) {
      return img.url;
    }
    
    // Se l'URL è un percorso relativo
    if (img.url) {
      return `https://rilievi-perizie-0ldb.onrender.com${img.url}`;
    }
    
    // Fallback per immagini che non hanno un URL valido
    return 'assets/image-placeholder.png';
  }

  async visualizzaImmagine(img: any) {
    const modal = await this.modalController.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrl: this.getImageUrl(img)
      },
      cssClass: 'image-modal'
    });
    
    await modal.present();
  }

  async modificaPerizia() {
    if (!this.perizia) {
      console.error('Perizia non disponibile per la modifica');
      return;
    }
    
    const modal = await this.modalController.create({
      component: ModificaPeriziaComponent,
      componentProps: {
        perizia: {...this.perizia}  // Passa una copia per evitare modifiche dirette
      }
    });
    
    await modal.present();
    
    // Attendi la chiusura del modale
    const { data } = await modal.onWillDismiss();
    
    // Se il modale ha comunicato un aggiornamento, ricarica i dati
    if (data && data.updated) {
      console.log('Perizia modificata, ricarico i dati');
      this.caricaPerizia();
    }
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
        // Aggiorna l'URL con il nuovo dominio di Render
        url: `https://rilievi-perizie-0ldb.onrender.com/perizie/${this.periziaId}`,
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