import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class FotoService {
  public photos: { filepath: string; webviewPath: string; commento: string }[] = [];
  
  constructor(private platform: Platform, private storage: Storage) {}

  public async addNewPhoto() {
    // Prendi una foto
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 80
    });
    
    // Salva la foto e aggiungi al array
    const savedImageFile = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    
    return savedImageFile;
  }

  private async savePicture(photo: Photo) {
    // Converti foto in formato base64
    const base64Data = await this.readAsBase64(photo);
    
    // Scrivi il file nel filesystem
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });
    
    if (this.platform.is('hybrid')) {
      // Leggi il file se siamo in un dispositivo nativo
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
        commento: ''
      };
    }
    else {
      // Usa webPath se siamo nel browser
      return {
        filepath: fileName,
        webviewPath: photo.webPath || '',
        commento: ''
      };
    }
  }

  // Converti una foto in formato base64
  private async readAsBase64(photo: Photo) {
    // "hybrid" è Capacitor o Cordova
    if (this.platform.is('hybrid')) {
      if (!photo.path) {
        throw new Error('Photo path is undefined');
      }
      const file = await Filesystem.readFile({
        path: photo.path
      });
      return file.data;
    }
    else {
      // Recupera la foto, leggi come blob, poi converti in base64
      if (!photo.webPath) {
        throw new Error('Photo webPath is undefined');
      }
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }

  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });

  public addCommento(index: number, commento: string) {
    if (this.photos[index]) {
      this.photos[index].commento = commento;
    }
  }
}