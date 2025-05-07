import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Storage } from '@ionic/storage-angular';
import { Platform, AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class FotoService {
  public photos: UserPhoto[] = [];
  
  constructor(private platform: Platform, private storage: Storage, private alertController: AlertController) {}

  // Nuovo metodo per mostrare le opzioni
  async scegliSorgenteFoto(): Promise<UserPhoto | null> {
    try {
      // Verifica i permessi prima di procedere
      await Camera.checkPermissions();
      
      // Prepara le opzioni per la fotocamera
      const options = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        promptLabelHeader: 'Seleziona sorgente',
        promptLabelCancel: 'Annulla',
        promptLabelPhoto: 'Dalla galleria',
        promptLabelPicture: 'Scatta foto'
      };
      
      // Chiedi all'utente se vuole usare la fotocamera o la galleria
      const source = await this.presentSourceChoice();
      
      if (!source) return null; // L'utente ha annullato
      
      // Cattura l'immagine dalla sorgente selezionata
      const image = await Camera.getPhoto({
        ...options,
        source: source
      });
      
      // Processa la foto e aggiungila all'array
      const newPhoto = await this.savePhoto(image);
      return newPhoto;
    } catch (error) {
      console.error('Errore durante l\'acquisizione della foto', error);
      return null;
    }
  }
  
  // Helper per mostrare la scelta tra fotocamera e galleria
  private async presentSourceChoice(): Promise<CameraSource | null> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Scegli sorgente',
        buttons: [
          {
            text: 'Annulla',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Fotocamera',
            handler: () => resolve(CameraSource.Camera)
          },
          {
            text: 'Galleria',
            handler: () => resolve(CameraSource.Photos)
          }
        ]
      });
      
      await alert.present();
    });
  }
  
  // Metodo per salvare la foto
  private async savePhoto(photo: Photo): Promise<UserPhoto> {
    // Converti in base64 se necessario
    const base64Data = await this.readAsBase64(photo);
    
    // Crea un nuovo oggetto UserPhoto
    const newPhoto: UserPhoto = {
      commento: '',  // Aggiunto campo obbligatorio
      filepath: new Date().getTime() + '.jpeg',
      webviewPath: photo.webPath,
      base64: base64Data
    };
    
    // Aggiungi all'array
    this.photos.unshift(newPhoto);
    
    return newPhoto;
  }
  
  // Metodo per convertire in base64
  private async readAsBase64(photo: Photo): Promise<string> {
    if (this.platform.is('hybrid')) {
      const file = await Filesystem.readFile({
          path: photo.path!,
          encoding: 'base64'.toString() as Encoding
        });
      return file.data as string;
    } else {
      // Web: Fetch dalla webview path
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }
  
  private convertBlobToBase64 = (blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };

  public addCommento(index: number, commento: string) {
    if (this.photos[index]) {
      this.photos[index].commento = commento;
    }
  }

  async getFilesFromPhotos(): Promise<File[]> {
    const files: File[] = [];
    
    console.log('Convertendo', this.photos.length, 'foto in file');
    
    for (const photo of this.photos) {
      if (photo.webviewPath) {
        try {
          // Converti base64/webviewPath in Blob
          const response = await fetch(photo.webviewPath);
          const blob = await response.blob();
          
          // Genera un nome univoco per il file
          const fileName = `photo_${new Date().getTime()}_${Math.floor(Math.random() * 1000)}.jpeg`;
          
          // Crea un File dal Blob
          const file = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          
          console.log('File creato:', file.name, file.size, 'bytes');
          files.push(file);
        } catch (e) {
          console.error('Errore conversione foto in file', e);
        }
      }
    }
    
    return files;
  }
}

export interface UserPhoto {
  commento: string;
  filepath: string;
  webviewPath?: string;
  base64?: string;
}