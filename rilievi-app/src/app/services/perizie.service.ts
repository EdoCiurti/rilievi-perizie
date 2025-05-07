import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { Perizia } from '../pages/models/perizia.models';

const API_URL = 'https://rilievi-perizie-0ldb.onrender.com/api';

@Injectable({
  providedIn: 'root'
})
export class PerizieService {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): Observable<HttpHeaders> {
    return of(this.authService.getToken()).pipe(
      switchMap(token => {
        return of(new HttpHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }));
      })
    );
  }

// Correggi il metodo getPerizie per non richiedere parametri
getPerizie(): Observable<Perizia[]> {
  return of(this.authService.getToken()).pipe(
    switchMap(token => {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
      return this.http.get<Perizia[]>(`${API_URL}/perizie`, { headers });
    })
  );
}

// Aggiungi il metodo checkServerStatus
checkServerStatus(): Observable<any> {
  // Endpoint di health check - crea un endpoint simile nel tuo server
  return this.http.get(`${API_URL}/health`);
}

  getPeriziaById(id: string): Observable<Perizia> {
    return of(this.authService.getToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
        return this.http.get<Perizia>(`${API_URL}/perizie/${id}`, { headers });
      })
    );
  }

  creaPerizia(dati: any, immagini?: File[]): Observable<any> {
    return from(Promise.resolve(this.authService.getToken())).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('Token non disponibile. Effettua il login.'));
        }
        
        const formData = new FormData();
        
        // Aggiungi i dati di base della perizia
        if (dati.cliente) formData.append('cliente', dati.cliente);
        if (dati.descrizione) formData.append('descrizione', dati.descrizione);
        if (dati.indirizzo) formData.append('indirizzo', dati.indirizzo);
        if (dati.stato) formData.append('stato', dati.stato);
        
        // Gestione speciale per le coordinate
        if (dati.coordinate && Array.isArray(dati.coordinate) && dati.coordinate.length === 2) {
          try {
            // Assicurati che siano numeri validi
            const lat = parseFloat(dati.coordinate[0]);
            const lng = parseFloat(dati.coordinate[1]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              // Formatta le coordinate come stringa JSON valida
              const coordString = JSON.stringify([lat, lng]);
              console.log('Coordinate formattate:', coordString);
              formData.append('coordinate', coordString);
            }
          } catch (e) {
            console.error('Errore nella formattazione delle coordinate', e);
          }
        }
        
        // Aggiungi le immagini
        if (immagini && immagini.length > 0) {
          immagini.forEach((immagine, index) => {
            formData.append('immagini', immagine, immagine.name || `immagine_${index}.jpg`);
          });
        }
        
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        
        return this.http.post(`${API_URL}/perizie`, formData, { 
          headers,
          reportProgress: true
        }).pipe(
          catchError(error => {
            console.error('Errore API creazione perizia:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  modificaPerizia(id: string, dati: any, nuoveImmagini?: File[], immaginiDaEliminare?: string[]): Observable<any> {
    return from(Promise.resolve(this.authService.getToken())).pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => new Error('Token non disponibile. Effettua il login.'));
        }
        
        const formData = new FormData();
        
        // Aggiungi l'ID della perizia da modificare
        formData.append('id', id);
        
        // Aggiungi i dati di base della perizia
        if (dati.cliente) formData.append('cliente', dati.cliente);
        if (dati.descrizione) formData.append('descrizione', dati.descrizione);
        if (dati.indirizzo) formData.append('indirizzo', dati.indirizzo);
        if (dati.stato) formData.append('stato', dati.stato);
        
        // Gestione speciale per le coordinate
        if (dati.coordinate && Array.isArray(dati.coordinate) && dati.coordinate.length === 2) {
          try {
            // Assicurati che siano numeri validi
            const lat = parseFloat(dati.coordinate[0]);
            const lng = parseFloat(dati.coordinate[1]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              // Formatta le coordinate come stringa JSON
              const coordString = JSON.stringify([lat, lng]);
              console.log('Coordinate formattate per modifica:', coordString);
              formData.append('coordinate', coordString);
            }
          } catch (e) {
            console.error('Errore nella formattazione delle coordinate durante modifica', e);
          }
        }
        
        // Aggiungi informazioni sulle immagini da eliminare
        if (immaginiDaEliminare && immaginiDaEliminare.length > 0) {
          formData.append('immaginiDaEliminare', JSON.stringify(immaginiDaEliminare));
        }
        
        // Aggiungi le nuove immagini
        if (nuoveImmagini && nuoveImmagini.length > 0) {
          nuoveImmagini.forEach((immagine, index) => {
            formData.append('immagini', immagine, immagine.name || `nuova_immagine_${index}.jpg`);
          });
        }
        
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        
        // Log per debug
        console.log(`Invio aggiornamento perizia ${id} al server`);
        console.log('Dati principali:', {
          cliente: dati.cliente,
          indirizzo: dati.indirizzo,
          descrizione: dati.descrizione,
          coordinate: dati.coordinate,
          stato: dati.stato,
          nuoveImmagini: nuoveImmagini?.length || 0,
          immaginiDaEliminare: immaginiDaEliminare?.length || 0
        });
        
        // Usa PUT per l'aggiornamento
        return this.http.put(`${API_URL}/perizie/${id}`, formData, { 
          headers,
          reportProgress: true
        }).pipe(
          catchError(error => {
            console.error('Errore API aggiornamento perizia:', error);
            return throwError(() => error);
          })
        );
      })
    );
  }

  eliminaPerizia(id: string): Observable<any> {
    return of(this.authService.getToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token || ''}`);
        return this.http.delete(`${API_URL}/perizie/${id}`, { headers });
      })
    );
  }

  aggiornaStatoPerizia(id: string, stato: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const token = this.authService.getToken() || '';
      of(token).pipe(
        switchMap(token => {
          const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
          return this.http.put(`${API_URL}/perizie/stato/${id}`, { stato }, { headers });
        })
      ).subscribe(
        (response) => resolve(response),
        (error) => reject(error)
      );
    });
  }
}