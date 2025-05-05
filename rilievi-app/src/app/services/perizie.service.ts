import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { FotoService } from './foto.service';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Geolocation } from '@capacitor/geolocation';

const API_URL = 'https://rilievi-perizie.onrender.com/api';

@Injectable({
  providedIn: 'root'
})
export class PerizieService {
  [x: string]: any;
  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private fotoService: FotoService
  ) {}
  
  // Ottieni tutte le perizie dell'utente
  getPerizie(): Observable<any> {
    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get(`${API_URL}/perizie`, { headers });
      })
    );
  }
  
  // Ottieni dettaglio di una perizia
  getPerizia(id: string): Observable<any> {
    return from(this.authService.getToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get(`${API_URL}/perizie/${id}`, { headers });
      })
    );
  }
  
  // Crea una nuova perizia
  async creaPerizia(descrizione: string, cliente: string, indirizzo: string): Promise<any> {
    try {
      // Ottieni posizione corrente
      const position = await Geolocation.getCurrentPosition();
      const coordinate = [position.coords.latitude, position.coords.longitude];
      
      // Crea FormData per l'invio
      const formData = new FormData();
      formData.append('descrizione', descrizione);
      formData.append('cliente', cliente);
      formData.append('indirizzo', indirizzo);
      formData.append('coordinate', JSON.stringify(coordinate));
      formData.append('stato', 'In corso');
      
      // Aggiungi le foto con commenti
      for (let i = 0; i < this.fotoService.photos.length; i++) {
        const photo = this.fotoService.photos[i];
        
        // Converti webPath in Blob
        const response = await fetch(photo.webviewPath);
        const blob = await response.blob();
        
        // Aggiungi immagine e commento
        formData.append('immagini', blob, `immagine_${i}.jpeg`);
        formData.append('commenti', photo.commento || '');
      }
      
      // Invia al server
      const token = await this.authService.getToken();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      return this.http.post(`${API_URL}/perizie`, formData, { headers }).toPromise();
    } catch (error) {
      console.error('Errore nella creazione della perizia', error);
      throw error;
    }
  }
  // Aggiungi questo metodo alla classe PerizieService

eliminaPerizia(id: string): Observable<any> {
  return from(this.authService.getToken()).pipe(
    switchMap(token => {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      return this.http.delete(`${API_URL}/perizie/${id}`, { headers });
    })
  );
}

aggiornaStatoPerizia(id: string, stato: string): Promise<any> {
  return from(this.authService.getToken()).pipe(
    switchMap(token => {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      return this.http.patch(`${API_URL}/perizie/${id}/stato`, { stato }, { headers });
    })
  ).toPromise();
}
}