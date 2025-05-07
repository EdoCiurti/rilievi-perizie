import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { firstValueFrom } from 'rxjs';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService,
    private platform: Platform
  ) {
    // Forza tema chiaro
    document.body.classList.remove('dark');
    document.documentElement.classList.remove('dark');
    
    // Gestisci il loading indicator in modo più robusto
    this.platform.ready().then(() => {
      console.log('Platform ready');
      this.removeLoadingIndicator();
    });
    
    // Backup: rimuovi il loader dopo un timeout massimo
    setTimeout(() => {
      this.removeLoadingIndicator();
    }, 5000);
  }
  
  private removeLoadingIndicator() {
    console.log('Tentativo di rimozione loading indicator');
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) {
      console.log('Loading indicator trovato e rimosso');
      loadingElement.style.display = 'none';
    } else {
      console.log('Loading indicator non trovato');
      // Cerca di nuovo dopo un breve ritardo
      setTimeout(() => {
        const retryElement = document.getElementById('loading-indicator');
        if (retryElement) {
          console.log('Loading indicator trovato al secondo tentativo');
          retryElement.style.display = 'none';
        }
      }, 1000);
    }
  }
  
  async ngOnInit() {
    console.log('AppComponent inizializzato');
    
    try {
      // Usa firstValueFrom per convertire l'observable in promise
      const isAuthenticated = await firstValueFrom(this.authService.isAuthenticated());
      
      console.log('Stato autenticazione:', isAuthenticated);
      
      if (isAuthenticated) {
        console.log('Utente autenticato, reindirizzamento a home');
        this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        console.log('Utente non autenticato, reindirizzamento a login');
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    } catch (error) {
      console.error('Errore durante la verifica autenticazione:', error);
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } finally {
      // Assicurati che il loading indicator sia rimosso anche qui
      this.removeLoadingIndicator();
    }
  }
}