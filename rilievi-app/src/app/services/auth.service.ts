import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'https://rilievi-perizie.onrender.com/api';
const TOKEN_KEY = 'auth-token';

interface JwtPayload {
  exp: number;
  // Add other JWT claims you need here
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();
  
  constructor(private http: HttpClient, private storage: Storage) {
    this.init();
  }

  async init() {
    await this.storage.create();
    await this.checkToken();
  }

  private async checkToken() {
    const token = await this.storage.get(TOKEN_KEY);
    if (token) {
      const decoded = jwtDecode<JwtPayload>(token);
      const isExpired = decoded.exp < Date.now() / 1000;
      
      if (!isExpired) {
        this.currentUserSubject.next(decoded);
      } else {
        await this.storage.remove(TOKEN_KEY);
      }
    }
  }

  async getToken(): Promise<string | null> {
    return await this.storage.get(TOKEN_KEY);
  }

  login(credentials: {username: string, password: string}): Observable<any> {
    return this.http.post(`${API_URL}/login`, credentials).pipe(
      tap((response: any) => {
        if (response && response.token) {
          this.storage.set(TOKEN_KEY, response.token);
          const decoded = jwtDecode<JwtPayload>(response.token);
          this.currentUserSubject.next(decoded);
        }
      })
    );
  }

  logout(): Promise<void> {
    this.currentUserSubject.next(null);
    return this.storage.remove(TOKEN_KEY);
  }
  
  isAuthenticated(): Observable<boolean> {
    return from(this.getToken()).pipe(
      map(token => {
        if (!token) return false;
        
        try {
          const decoded = jwtDecode<JwtPayload>(token);
          return decoded.exp > Date.now() / 1000;
        } catch (error) {
          return false;
        }
      })
    );
  }
}