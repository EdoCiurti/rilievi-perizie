import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  // Utilizziamo OpenStreetMap/Nominatim (gratuito e senza API key)
  private nominatimUrl = 'https://nominatim.openstreetmap.org/search';
  
  constructor(private http: HttpClient) { }
  
  /**
   * Converte un indirizzo in coordinate geografiche
   * @param address L'indirizzo da geocodificare (es. "Via Torino 4, Savigliano")
   * @returns Un Observable con le coordinate [lat, lng] o null se non trovate
   */
  geocodeAddress(address: string): Observable<[number, number] | null> {
    if (!address) {
      return of(null);
    }
    
    const params = {
      q: address,
      format: 'json',
      limit: '1',
      addressdetails: '1'
    };
    
    return this.http.get(this.nominatimUrl, { params }).pipe(
      map((response: any) => {
        if (response && response.length > 0) {
          const result = response[0];
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);
          console.log(`Geocoding: "${address}" → [${lat}, ${lon}]`);
          return [lat, lon] as [number, number];
        }
        return null;
      }),
      catchError(error => {
        console.error('Errore durante la geocodifica:', error);
        return of(null);
      })
    );
  }

  /**
   * Converte coordinate geografiche in un indirizzo
   * @param lat La latitudine
   * @param lon La longitudine
   * @returns Un Observable con l'indirizzo o null se non trovato
   */
  reverseGeocode(lat: number, lon: number): Observable<string | null> {
    const reverseUrl = 'https://nominatim.openstreetmap.org/reverse';
    const params = {
      lat: lat.toString(),
      lon: lon.toString(),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'it'
    };
    
    return this.http.get(reverseUrl, { params }).pipe(
      map((response: any) => {
        if (response && response.display_name) {
          console.log(`Reverse geocoding: [${lat}, ${lon}] → "${response.display_name}"`);
          return response.display_name;
        }
        return null;
      }),
      catchError(error => {
        console.error('Errore durante il geocoding inverso:', error);
        return of(null);
      })
    );
  }
}