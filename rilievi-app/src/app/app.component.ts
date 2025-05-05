import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DatabaseService } from './services/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet, RouterLink, RouterLinkActive]
})
export class AppComponent {
  constructor(private databaseService: DatabaseService) {
    // Il servizio database inizializzerà SQLite automaticamente durante la costruzione
  }
}