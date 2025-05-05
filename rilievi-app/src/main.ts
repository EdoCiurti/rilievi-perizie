import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http';
import { APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { IonicStorageModule, Storage } from '@ionic/storage-angular';
import { DatabaseService } from './app/services/database.service';

// Funzione di inizializzazione per Storage con gestione errori
function initializeStorage(storage: Storage) {
  return async () => {
    try {
      await storage.create();
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  };
}

function initializeDatabase(databaseService: DatabaseService) {
  return () => databaseService.init();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideIonicAngular(),
    provideHttpClient(),
    // Importa IonicStorageModule con configurazione più robusta
    importProvidersFrom(IonicStorageModule.forRoot({
      name: 'rilievi_perizie_db',
      driverOrder: [
        'indexeddb', 
        'localstorage', 
        'websql',
        'sessionStorage'
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
});