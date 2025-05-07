import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  
  constructor(private alertController: AlertController) { }
  
  async getCurrentPosition(): Promise<[number, number] | null> {
    try {
      console.log('Inizio richiesta posizione');
      
      // Verifica se siamo su web o dispositivo nativo
      const platform = Capacitor.getPlatform();
      console.log('Piattaforma:', platform);
      
      if (platform !== 'web') {
        console.log('Controllo permessi su dispositivo');
        const permissionStatus = await Geolocation.checkPermissions();
        console.log('Stato permessi:', permissionStatus);
        
        if (permissionStatus.location !== 'granted') {
          console.log('Richiesta permessi');
          const requestResult = await Geolocation.requestPermissions();
          console.log('Risultato richiesta permessi:', requestResult);
          
          if (requestResult.location !== 'granted') {
            this.showPermissionAlert();
            return null;
          }
        }
      }
      
      // Prova a ottenere la posizione con timeout elevato
      console.log('Richiesta posizione...');
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000 // 30 secondi
      });
      
      console.log('Posizione ottenuta:', position);
      return [position.coords.latitude, position.coords.longitude];
    } catch (error) {
      console.error('Errore durante il rilevamento della posizione:', error);
      
      // Mostra un messaggio di errore specifico
      if (typeof error === 'object' && error !== null && 'message' in error && 
          typeof (error as any).message === 'string' && (error as any).message.includes('denied')) {
        this.showPermissionAlert();
      } else {
        this.showGenericErrorAlert();
      }
      
      return null;
    }
  }
  
  private async showPermissionAlert() {
    const alert = await this.alertController.create({
      header: 'Permesso negato',
      message: 'Per utilizzare questa funzionalità è necessario consentire l\'accesso alla posizione nelle impostazioni del dispositivo.',
      buttons: ['OK']
    });
    await alert.present();
  }
  
  private async showGenericErrorAlert() {
    const alert = await this.alertController.create({
      header: 'Errore posizione',
      message: 'Impossibile rilevare la posizione attuale. Verifica che il GPS sia attivo e riprova.',
      buttons: ['OK']
    });
    await alert.present();
  }
}