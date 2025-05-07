import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { ActionSheetController, Platform, AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FotoService {
  public photos: any[] = [];
  
  constructor(
    private actionSheetController: ActionSheetController,
    private platform: Platform,
    private alertController: AlertController
  ) {}
  
  async scegliSorgenteFoto() {
    // Richiedi permessi esplicitamente prima di mostrare le opzioni
    await this.requestCameraPermissions();
    
    const actionSheet = await this.actionSheetController.create({
      header: 'Seleziona fonte immagine',
      buttons: [
        {
          text: 'Fotocamera',
          icon: 'camera',
          handler: async () => {
            // Chiamata asincrona e attesa risultato
            const photo = await this.scattaFoto(CameraSource.Camera);
            actionSheet.dismiss(photo);
            return true;
          }
        },
        {
          text: 'Galleria',
          icon: 'image',
          handler: async () => {
            // Chiamata asincrona e attesa risultato
            const photo = await this.scattaFoto(CameraSource.Photos);
            actionSheet.dismiss(photo);
            return true;
          }
        },
        {
          text: 'Annulla',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });
    
    await actionSheet.present();
    
    // Attendi esplicitamente la chiusura dell'action sheet
    const { data } = await actionSheet.onDidDismiss();
    console.log("Action sheet dismissed with data:", data);
    return data;
  }
  
  // Nuova funzione per richiesta esplicita di permessi
  async requestCameraPermissions() {
    try {
      // Richiedi permessi per fotocamera e galleria
      const permissions = await Camera.requestPermissions({
        permissions: ['camera', 'photos']
      });
      
      console.log('Permessi fotocamera:', permissions);
      
      // Se i permessi sono negati, mostra un alert
      if (permissions.camera !== 'granted') {
        await this.showPermissionAlert();
      }
      
      return permissions;
    } catch (error) {
      console.error('Errore richiesta permessi:', error);
      return null;
    }
  }
  
  async scattaFoto(source: CameraSource) {
    try {
      console.log(`Apertura ${source === CameraSource.Camera ? 'fotocamera' : 'galleria'}...`);
      
      // Opzioni migliorate per la fotocamera
      const capturedPhoto = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: source,
        quality: 75,
        saveToGallery: true,
        correctOrientation: true,
        width: 1080,
        promptLabelHeader: source === CameraSource.Camera ? 'Scatta una foto' : 'Scegli un\'immagine',
        promptLabelCancel: 'Annulla'
      });
      
      console.log('Foto acquisita:', capturedPhoto);
      
      // Crea l'oggetto photo solo se la foto è valida
      if (capturedPhoto && capturedPhoto.webPath) {
        const photoObj = {
          filepath: capturedPhoto.path || '',
          webPath: capturedPhoto.webPath,
          format: capturedPhoto.format,
          isNew: true
        };
        
        this.photos.push(photoObj);
        return photoObj;
      }
      
      return null;
    } catch (error) {
      console.error('Errore durante l\'acquisizione della foto:', error);
      // Mostra un alert in caso di errore
      this.showErrorAlert(error);
      return null;
    }
  }
  
  // Alert per errori
  private async showErrorAlert(error: any) {
    const alert = await this.alertController.create({
      header: 'Errore Fotocamera',
      message: 'Si è verificato un errore durante l\'accesso alla fotocamera: ' + (error.message || error),
      buttons: ['OK']
    });
    
    await alert.present();
  }
  
  // Alert per permessi negati
  private async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permessi Richiesti',
      message: 'Per scattare foto, l\'app necessita dei permessi per accedere alla fotocamera. Vai nelle impostazioni del dispositivo per abilitarli.',
      buttons: ['OK']
    });
    
    await alert.present();
  }
  
  async getFilesFromPhotos() {
    const files: File[] = [];
    
    for (const photo of this.photos.filter(p => p.isNew)) {
      if (photo.webPath) {
        try {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          
          const fileName = new Date().getTime() + '.jpg';
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          files.push(file);
        } catch (error) {
          console.error('Errore nella conversione dell\'immagine', error);
        }
      }
    }
    
    return files;
  }
  
  resetPhotos() {
    this.photos = [];
  }
}