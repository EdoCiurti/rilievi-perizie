import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { PerizieService } from '../../services/perizie.service';
import { FotoService } from '../../services/foto.service';
import { GeolocationService } from '../../services/geolocation.service';
import { GeocodingService } from '../../services/geocoding.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nuova-perizia',
  templateUrl: './nuova-perizia.page.html',
  styleUrls: ['./nuova-perizia.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class NuovaPeriziaPage implements OnInit {
  periziaForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private perizieService: PerizieService,
    public fotoService: FotoService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private geoService: GeolocationService,
    private geocodingService: GeocodingService
  ) { }

  ngOnInit() {
    this.periziaForm = this.formBuilder.group({
      descrizione: ['', Validators.required],
      cliente: ['', Validators.required],
      indirizzo: ['', Validators.required],
      coordinate: [null] // Aggiungi esplicitamente il campo coordinate
    });
  }

  async aggiungiImmagine() {
    const photo = await this.fotoService.scegliSorgenteFoto();
    if (photo) {
      // La foto è stata aggiunta all'array this.fotoService.photos
      console.log('Foto aggiunta con successo');
    }
  }

  rimuoviFoto(index: number) {
    this.fotoService.photos.splice(index, 1);
  }

  async inviaPeriza() {
    if (this.periziaForm.invalid) {
      this.highlightInvalidFields();
      return;
    }

    if (this.fotoService.photos.length === 0) {
      const alert = await this.alertController.create({
        header: 'Attenzione',
        message: 'È necessario aggiungere almeno una foto alla perizia',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    // Verifica se ci sono coordinate valide
    if (!this.periziaForm.value.coordinate || !Array.isArray(this.periziaForm.value.coordinate) || 
        this.periziaForm.value.coordinate.length !== 2) {
      // Se non ci sono coordinate, prova a ottenerle dall'indirizzo
      try {
        const coords = await this.geocodingService.geocodeAddress(this.periziaForm.value.indirizzo).toPromise();
        if (coords) {
          this.periziaForm.patchValue({ coordinate: coords });
        }
      } catch (err) {
        console.log('Non è stato possibile ottenere le coordinate dall\'indirizzo');
      }
    }

    this.isSubmitting = true;

    const loading = await this.loadingController.create({
      message: 'Creazione perizia in corso...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      // Converti le foto in File objects
      const immagini = await this.fotoService.getFilesFromPhotos();
      console.log('Immagini convertite:', immagini.length);
      
      // Crea l'oggetto dati
      const datiPerizia = {
        descrizione: this.periziaForm.value.descrizione,
        cliente: this.periziaForm.value.cliente,
        indirizzo: this.periziaForm.value.indirizzo,
        // Assicurati che le coordinate siano un array di numeri
        coordinate: Array.isArray(this.periziaForm.value.coordinate) ? 
                   [parseFloat(this.periziaForm.value.coordinate[0]), 
                    parseFloat(this.periziaForm.value.coordinate[1])] : null,
        stato: 'In corso' // Stato predefinito
      };
      
      console.log('Dati perizia:', datiPerizia);
      
      // Aggiungi questo debug prima dell'invio
      console.log('Coordinate da inviare:', 
        datiPerizia.coordinate ? 
        `[${datiPerizia.coordinate[0]}, ${datiPerizia.coordinate[1]}] (tipo: ${typeof datiPerizia.coordinate[0]})` : 
        'nessuna coordinata');
      
      // Chiama il servizio con i parametri corretti - non usare toPromise()
      this.perizieService.creaPerizia(datiPerizia, immagini).subscribe({
        next: (result) => {
          console.log('Perizia creata con successo:', result);
          
          // Reset del form e delle foto
          this.periziaForm.reset();
          this.fotoService.photos = [];

          loading.dismiss();
          this.isSubmitting = false;
          
          this.toastController.create({
            message: 'Perizia creata con successo',
            duration: 2000,
            color: 'success'
          }).then(toast => toast.present());

          this.router.navigate(['/home']);
        },
        error: async (error) => {
          console.error('Errore creazione perizia', error);
          loading.dismiss();
          this.isSubmitting = false;
          
          const alert = await this.alertController.create({
            header: 'Errore',
            message: error?.error?.message || 'Si è verificato un errore durante la creazione della perizia',
            buttons: ['OK']
          });
          await alert.present();
        }
      });
    } catch (error) {
      console.error('Errore generale', error);
      this.isSubmitting = false;
      loading.dismiss();
      
      const alert = await this.alertController.create({
        header: 'Errore',
        message: 'Si è verificato un errore durante la preparazione dei dati',
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  async ottieniPosizione() {
    try {
      const loading = await this.loadingController.create({
        message: 'Rilevamento posizione...',
        spinner: 'dots',
        duration: 30000 // 30 secondi max
      });
      await loading.present();
      
      // Prova con Capacitor Geolocation
      let coordinate = await this.geoService.getCurrentPosition();
      
      // Fallback al browser navigator se Capacitor fallisce
      if (!coordinate && navigator.geolocation) {
        coordinate = await this.getBrowserPosition();
      }
      
      if (coordinate) {
        console.log('Posizione ottenuta:', coordinate);
        // Aggiungi le coordinate al form
        this.periziaForm.patchValue({
          coordinate: coordinate
        });
        
        // Ora ottieni l'indirizzo dalle coordinate
        this.geocodingService.reverseGeocode(coordinate[0], coordinate[1]).subscribe({
          next: async (indirizzo) => {
            loading.dismiss();
            
            if (indirizzo) {
              // Aggiorna il campo indirizzo con la posizione rilevata
              this.periziaForm.patchValue({
                indirizzo: indirizzo
              });
              
              const toast = await this.toastController.create({
                message: 'Posizione rilevata e indirizzo aggiornato',
                duration: 2000,
                color: 'success'
              });
              toast.present();
            } else {
              const toast = await this.toastController.create({
                message: 'Posizione rilevata, ma non è stato possibile determinare l\'indirizzo',
                duration: 3000,
                color: 'warning'
              });
              toast.present();
            }
          },
          error: (error) => {
            loading.dismiss();
            console.error('Errore geocoding inverso:', error);
          }
        });
      } else {
        loading.dismiss();
        const alert = await this.alertController.create({
          header: 'Posizione non disponibile',
          message: 'Impossibile rilevare la posizione. Verifica che la geolocalizzazione sia attiva.',
          buttons: ['OK']
        });
        await alert.present();
      }
    } catch (error) {
      console.error('Errore durante ottieniPosizione:', error);
      this.loadingController.dismiss();
    }
  }

  // Fallback al browser navigator.geolocation
  private getBrowserPosition(): Promise<[number, number] | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('Browser geolocation not supported');
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Browser geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
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
      next: async (coordinate) => {
        loading.dismiss();
        
        if (coordinate) {
          this.periziaForm.patchValue({ coordinate });
          
          const toast = await this.toastController.create({
            message: 'Coordinate trovate con successo',
            duration: 2000,
            color: 'success'
          });
          toast.present();
        } else {
          const alert = await this.alertController.create({
            header: 'Indirizzo non trovato',
            message: 'Non è stato possibile trovare le coordinate per questo indirizzo. Prova a essere più specifico.',
            buttons: ['OK']
          });
          alert.present();
        }
      },
      error: async (error) => {
        loading.dismiss();
        console.error('Errore geocoding:', error);
        
        const alert = await this.alertController.create({
          header: 'Errore',
          message: 'Si è verificato un errore durante la ricerca delle coordinate',
          buttons: ['OK']
        });
        alert.present();
      }
    });
  }

  // Aggiungi questo metodo per evidenziare i campi invalidi
  private highlightInvalidFields() {
    Object.keys(this.periziaForm.controls).forEach(field => {
      const control = this.periziaForm.get(field);
      if (control?.invalid) {
        control.markAsTouched();
      }
    });
  }
}