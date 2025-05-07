import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, tap, catchError, timeout } from 'rxjs/operators';

// Costanti
const TOKEN_KEY = 'auth-token';
const API_URL = 'https://rilievi-perizie-0ldb.onrender.com/api';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient) {
    this.checkToken();
  }

  private checkToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      this.currentUserSubject.next({ token });
    }
  }

  login(credentials: {username: string, password: string}): Observable<any> {
    console.log('Invio credenziali al server:', API_URL);
    
    return this.http.post(`${API_URL}/login`, credentials).pipe(
      // Aggiungi un timeout di 15 secondi per evitare attese infinite
      timeout(15000),
      tap((response: any) => {
        console.log('Risposta login ricevuta:', response);
        if (response && response.token) {
          localStorage.setItem(TOKEN_KEY, response.token);
          this.currentUserSubject.next(response);
        }
      }),
      catchError(this.handleError)
    );
  }
  
  // Gestione errori migliorata
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    
    if (error.error instanceof ErrorEvent) {
      // Errore client-side
      errorMessage = `Errore: ${error.error.message}`;
      console.error('Errore client:', errorMessage);
    } else if (error.status === 0) {
      // Errore di rete/server non raggiungibile
      errorMessage = 'Il server non è raggiungibile. Verifica la tua connessione.';
      console.error('Errore di connessione al server');
    } else {
      // Errore server-side
      errorMessage = error.error?.message || `Errore del server: ${error.status}`;
      console.error(`Backend ha restituito codice ${error.status}, corpo:`, error.error);
    }
    
    return throwError(() => ({
      error: error.error,
      message: errorMessage,
      status: error.status
    }));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.currentUserSubject.next(null);
    console.log('Utente disconnesso, token rimosso');
  }

  isAuthenticated(): Observable<boolean> {
    const token = localStorage.getItem(TOKEN_KEY);
    // Se non c'è token, non è autenticato
    if (!token) {
      return of(false);
    }
    
    // Opzionale: verifica che il token non sia scaduto
    try {
      // Se il token è un JWT, puoi decodificarlo e controllare exp
      // Questo è un semplice check per vedere se il token è formattato come JWT
      if (token.split('.').length !== 3) {
        console.warn('Token non valido, formato non JWT');
        return of(false);
      }
      
      return of(true);
    } catch (e) {
      console.error('Errore nella verifica del token', e);
      return of(false);
    }
  }
  
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Per debug

}