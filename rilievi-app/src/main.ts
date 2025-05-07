import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { routes } from './app/app.routes';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, enableProdMode, importProvidersFrom, isDevMode } from '@angular/core';
import { IonicStorageModule, Storage } from '@ionic/storage-angular';
import { DatabaseService } from './app/services/database.service';
import { Capacitor } from '@capacitor/core';
import { Drivers } from '@ionic/storage';

// Se l'app è in esecuzione in un ambiente nativo, abilita la modalità produzione
if (Capacitor.isNativePlatform() && !isDevMode()) {
  enableProdMode();
}

// Funzione migliorata per inizializzazione Storage con retry
function initializeStorage(storage: Storage) {
  return async () => {
    try {
      // Prima prova a verificare se lo storage è già stato creato
      const storageDriver = await storage.driver;
      if (storageDriver) {
        console.log('Storage already initialized with driver:', storageDriver);
        return;
      }
      
      // Se non è stato inizializzato, crealo
      await storage.create();
      console.log('Storage initialized successfully with driver:', await storage.driver);
    } catch (error) {
      console.error('Storage initialization error:', error);
      
      // Tento un approccio alternativo con un driver specifico
      try {
        console.log('Trying alternative storage initialization...');
        await storage.defineDriver(Drivers.IndexedDB);
        await storage.create();
        console.log('Alternative storage initialization succeeded');
      } catch (fallbackError) {
        console.error('All storage initialization attempts failed:', fallbackError);
      }
    }
  };
}

// Funzione migliorata per l'inizializzazione del database
function initializeDatabase(databaseService: DatabaseService) {
  return async () => {
    try {
      await databaseService.init();
      console.log('SQLite database initialized');
    } catch (error) {
      console.error('Database initialization error:', error);
      
      // Se l'errore è che la connessione esiste già, possiamo considerarlo un successo
      if (error instanceof Error && error.toString().includes('already exists')) {
        console.log('Database connection already exists, continuing...');
        return;
      }
      
      throw error;
    }
  };
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes),
    provideIonicAngular({
      mode: 'md'  // Usa Material Design per coerenza visiva
    }),
    provideHttpClient(withInterceptorsFromDi()),
    
    // Storage configurato con driver espliciti per app mobile
    importProvidersFrom(IonicStorageModule.forRoot({
      name: 'rilievi_perizie_db',
      driverOrder: [
        Drivers.IndexedDB,
        Drivers.LocalStorage
      ]
    })),
    
    {
      provide: APP_INITIALIZER,
      useFactory: initializeStorage,
      deps: [Storage],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeDatabase,
      deps: [DatabaseService],
      multi: true
    }
  ]
}).catch(err => console.error('Errore bootstrap applicazione:', err));