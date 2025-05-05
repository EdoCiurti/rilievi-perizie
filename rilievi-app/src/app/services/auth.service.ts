import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { DatabaseService } from './database.service';

const API_URL = 'https://rilievi-perizie.onrender.com/api';
const TOKEN_KEY = 'auth-token';

// Fallback storage se Ionic Storage fallisce
class MemoryStorageFallback {
  private data = new Map<string, any>();
  
  async get(key: string): Promise<any> {
    return this.data.get(key);
  }
  
  async set(key: string, value: any): Promise<any> {
    this.data.set(key, value);
    return value;
  }
  
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser = this.currentUserSubject.asObservable();
  private fallbackStorage = new MemoryStorageFallback();
  private useNativeStorage = true;
  
  constructor(
    private http: HttpClient, 
    private storage: Storage,
    private databaseService: DatabaseService
  ) {
    this.checkToken();
  }

  private async getStorage(): Promise<Storage | MemoryStorageFallback> {
    if (this.useNativeStorage) {
      try {
        return this.storage;
      } catch (error) {
        console.warn('Fallback to memory storage');
        this.useNativeStorage = false;
        return this.fallbackStorage;
      }
    }
    return this.fallbackStorage;
  }

  private async checkToken() {
    try {
      const storage = await this.getStorage();
      const token = await storage.get(TOKEN_KEY);
      
      if (token) {
        try {
          const decoded = jwtDecode<{ exp: number }>(token);
          const isExpired = decoded.exp < Date.now() / 1000;
          
          if (!isExpired) {
            this.currentUserSubject.next(decoded);
          } else {
            await storage.remove(TOKEN_KEY);
          }
        } catch (error) {
          console.error('Invalid token format', error);
          await storage.remove(TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error('Error checking token', error);
    }
  }

  login(credentials: {username: string, password: string}): Observable<any> {
    return this.http.post(`${API_URL}/login`, credentials).pipe(
      tap(async (response: any) => {
        if (response && response.token) {
          const storage = await this.getStorage();
          await storage.set(TOKEN_KEY, response.token);
          const decoded = jwtDecode(response.token);
          this.currentUserSubject.next(decoded);
        }
      }),
      catchError(error => {
        console.error('Login failed', error);
        return of({ error: true, message: 'Login failed' });
      })
    );
  }

  async logout(): Promise<void> {
    try {
      const storage = await this.getStorage();
      await storage.remove(TOKEN_KEY);
      this.currentUserSubject.next(null);
    } catch (error) {
      console.error('Error during logout', error);
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const storage = await this.getStorage();
      return await storage.get(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token', error);
      return null;
    }
  }

  isAuthenticated(): Observable<boolean> {
    return from(this.getToken()).pipe(
      map(token => {
        if (!token) return false;
        
        try {
          const decoded: any = jwtDecode(token);
          return decoded.exp > Date.now() / 1000;
        } catch (error) {
          return false;
        }
      }),
      catchError(() => of(false))
    );
  }
}