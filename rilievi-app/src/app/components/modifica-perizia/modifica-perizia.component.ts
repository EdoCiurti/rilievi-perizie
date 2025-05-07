import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, ToastController, LoadingController, AlertController, IonicModule } from '@ionic/angular';
import { PerizieService } from '../../services/perizie.service';
import { FotoService } from '../../services/foto.service';
import { GeolocationService } from '../../services/geolocation.service';
import { GeocodingService } from '../../services/geocoding.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modifica-perizia',
  templateUrl: './modifica-perizia.component.html',
  styleUrls: ['./modifica-perizia.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class ModificaPeriziaComponent implements OnInit {
  @Input() perizia: any;
  periziaForm!: FormGroup;
  immaginiOriginali: any[] = [];
  immaginiDaEliminare: string[] = [];
  isLoading = false;
  
  constructor(
    private formBuilder: FormBuilder,
    private modalController: ModalController,
    private perizieService: PerizieService,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    public fotoService: FotoService,
    private geoService: GeolocationService,
    private geocodingService: GeocodingService
  ) {}
  
  ngOnInit() {
    if (!this.perizia) {
      this.closeModal();
      return;
    }
    
    this.immaginiOriginali = [...(this.perizia.immagini || [])];
    
    this.periziaForm = this.formBuilder.group({
      descrizione: [this.perizia.descrizione, Validators.required],
      cliente: [this.perizia.cliente, Validators.required],
      indirizzo: [this.perizia.indirizzo, Validators.required],
      stato: [this.perizia.stato || 'In corso', Validators.required],
      coordinate: [this.perizia.coordinate || null]
    });
    
    console.log('Form inizializzato con dati perizia:', this.periziaForm.value);
    console.log('Immagini originali:', this.immaginiOriginali);
  }
  
  closeModal(updated = false) {
    this.modalController.dismiss({
      updated: updated
    });
  }
  
  async aggiungiImmagine() {
    const photo = await this.fotoService.scegliSorgenteFoto();
    if (photo) {
      console.log('Nuova foto aggiunta:', photo);
    }
  }
  
  rimuoviFoto(index: number) {
    this.fotoService.photos.splice(index, 1);
  }
  
  rimuoviImmagineOriginale(id: string) {
    this.immaginiDaEliminare.push(id);
    this.immaginiOriginali = this.immaginiOriginali.filter(img => img._id !== id);
    console.log('Immagine marcata per eliminazione:', id);
    console.log('Immagini da eliminare:', this.immaginiDaEliminare);
  }
  
  async ottieniPosizione() {
    const loading = await this.loadingController.create({
      message: 'Rilevamento posizione...',
      spinner: 'dots'
    });
    await loading.present();
    
    try {
      const coordinate = await this.geoService.getCurrentPosition();
      
      loading.dismiss();
      
      if (coordinate) {
        this.periziaForm.patchValue({ coordinate });
        
        // Ottieni l'indirizzo per questa posizione
        this.geocodingService.reverseGeocode(coordinate[0], coordinate[1]).subscribe({
          next: (indirizzo) => {
            if (indirizzo) {
              this.periziaForm.patchValue({ indirizzo });
            }
          }
        });
        
        const toast = await this.toastController.create({
          message: 'Posizione aggiornata con successo',
          duration: 2000,
          color: 'success'
        });
        toast.present();
      } else {
        const alert = await this.alertController.create({
          header: 'Errore posizione',
          message: 'Impossibile rilevare la posizione. Verifica che il GPS sia attivo.',
          buttons: ['OK']
        });
        alert.present();
      }
    } catch (error) {
      loading.dismiss();
      console.error('Errore nel rilevamento posizione', error);
    }
  }
  
  async ottieniCoordinateDaIndirizzo() {
    const indirizzo = this.periziaForm.get('indirizzo')?.value;
    if (!indirizzo) {
      const toast = await this.toastController.create({
        message: 'Inserisci prima un indirizzo',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }
    
    const loading = await this.loadingController.create({
      message: 'Ricerca coordinate...',
      spinner: 'dots'
    });
    await loading.present();
    
    this.geocodingService.geocodeAddress(indirizzo).subscribe({
      next: (coordinate) => {
        loading.dismiss();
        
        if (coordinate) {
          this.periziaForm.patchValue({ coordinate });
          
          const toast = this.toastController.create({
            message: 'Coordinate trovate con successo',
            duration: 2000,
            color: 'success'
          });
          toast.then(t => t.present());
        } else {
          const alert = this.alertController.create({
            header: 'Indirizzo non trovato',
            message: 'Non è stato possibile trovare le coordinate per questo indirizzo.',
            buttons: ['OK']
          });
          alert.then(a => a.present());
        }
      },
      error: (error) => {
        loading.dismiss();
        console.error('Errore geocoding:', error);
      }
    });
  }
  
  async salvaModifiche() {
    if (this.periziaForm.invalid) {
      this.highlightInvalidFields();
      return;
    }
    
    this.isLoading = true;
    
    const loading = await this.loadingController.create({
      message: 'Salvataggio modifiche...',
      spinner: 'dots'
    });
    await loading.present();
    
    try {
      // Converti le nuove foto in File objects
      const nuoveImmagini = await this.fotoService.getFilesFromPhotos();
      
      // Prepara i dati aggiornati
      const datiAggiornati = {
        descrizione: this.periziaForm.value.descrizione,
        cliente: this.periziaForm.value.cliente,
        indirizzo: this.periziaForm.value.indirizzo,
        stato: this.periziaForm.value.stato,
        // Assicurati che le coordinate siano un array di numeri
        coordinate: Array.isArray(this.periziaForm.value.coordinate) ? 
                  [parseFloat(this.periziaForm.value.coordinate[0]), 
                   parseFloat(this.periziaForm.value.coordinate[1])] : null
      };
      
      console.log('Dati aggiornati da inviare:', datiAggiornati);
      console.log('Nuove immagini:', nuoveImmagini.length);
      console.log('Immagini da eliminare:', this.immaginiDaEliminare);
      
      // Effettua la chiamata al servizio
      this.perizieService.modificaPerizia(
        this.perizia._id,
        datiAggiornati,
        nuoveImmagini,
        this.immaginiDaEliminare
      ).subscribe({
        next: (result) => {
          loading.dismiss();
          this.isLoading = false;
          
          console.log('Perizia aggiornata con successo:', result);
          
          const toast = this.toastController.create({
            message: 'Perizia aggiornata con successo',
            duration: 2000,
            color: 'success'
          });
          toast.then(t => t.present());
          
          // Reset del foto service
          this.fotoService.photos = [];
          
          // Chiudi il modale e segnala l'aggiornamento
          this.closeModal(true);
        },
        error: async (error) => {
          loading.dismiss();
          this.isLoading = false;
          
          console.error('Errore aggiornamento perizia:', error);
          
          const alert = await this.alertController.create({
            header: 'Errore aggiornamento',
            message: error?.error?.message || 'Si è verificato un errore durante l\'aggiornamento della perizia',
            buttons: ['OK']
          });
          await alert.present();
        }
      });
    } catch (error) {
      loading.dismiss();
      this.isLoading = false;
      
      console.error('Errore generale durante la modifica:', error);
      
      const alert = await this.alertController.create({
        header: 'Errore',
        message: 'Si è verificato un errore durante la preparazione dei dati',
        buttons: ['OK']
      });
      await alert.present();
    }
  }
  
  private highlightInvalidFields() {
    Object.keys(this.periziaForm.controls).forEach(field => {
      const control = this.periziaForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }
}