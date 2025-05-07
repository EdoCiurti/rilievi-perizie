import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class DettaglioPeriziaPage implements OnInit, OnDestroy {
  periziaId!: string;
  perizia: any = null;
  isLoading = false;
  map: any = null;
  mapInitialized = false;

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
      setTimeout(() => this.initializeMap(), 800);
    }
  }

  caricaPerizia() {
    this.isLoading = true;
    
    this.perizieService.getPeriziaById(this.periziaId).subscribe(
      (perizia: any) => {
        this.perizia = perizia;
        this.isLoading = false;
        
        if (this.perizia?.coordinate && this.perizia.coordinate.length === 2) {
          setTimeout(() => this.initializeMap(), 300);
        }
      },
      (error: any) => {
        console.error('Errore caricamento perizia', error);
        this.isLoading = false;
        this.presentErrorToast();
      }
    );
  }

  initializeMap() {
    if (this.mapInitialized) {
      console.log('Mappa già inizializzata');
      return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Elemento mappa non trovato');
      return;
    }

    if (!this.perizia || !this.perizia.coordinate || 
        !Array.isArray(this.perizia.coordinate) || 
        this.perizia.coordinate.length !== 2) {
      console.error('Coordinate non valide:', this.perizia?.coordinate);
      return;
    }

    try {
      const lat = parseFloat(this.perizia.coordinate[0]);
      const lng = parseFloat(this.perizia.coordinate[1]);
      
      if (isNaN(lat) || isNaN(lng)) {
        console.error('Coordinate non sono numeri validi');
        return;
      }

      console.log('Inizializzazione mappa con coordinate:', lat, lng);

      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      mapElement.style.height = '300px';
      mapElement.style.width = '100%';
      mapElement.style.backgroundColor = '#f0f0f0';
      mapElement.style.border = '1px solid #ccc';

      setTimeout(() => {
        this.map = L.map('map', {
          center: [lat, lng],
          zoom: 13,
          zoomControl: true,
          attributionControl: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(this.map);

        const defaultIcon = L.divIcon({
          html: `<div style="
            background-color: #e74c3c;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
          "></div>`,
          className: 'custom-marker-icon',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        const marker = L.marker([lat, lng], { icon: defaultIcon }).addTo(this.map);
        marker.bindPopup(this.perizia.indirizzo || 'Posizione perizia').openPopup();

        setTimeout(() => {
          this.map.invalidateSize(true);
        }, 300);

        this.mapInitialized = true;
      }, 500);
      
    } catch (error) {
      console.error('Errore durante l\'inizializzazione della mappa:', error);
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
      this.map = null;
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
    if (img.url && img.url.startsWith('http')) {
      return img.url;
    }
    
    if (img.url) {
      return `https://rilievi-perizie-0ldb.onrender.com${img.url}`;
    }
    
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
        perizia: {...this.perizia}
      }
    });
    
    await modal.present();
    
    const { data } = await modal.onWillDismiss();
    
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