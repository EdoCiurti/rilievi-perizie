import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Storage } from '@ionic/storage-angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet]
})
export class AppComponent {
  constructor(private storage: Storage) {
    this.initializeApp();
  }

  async initializeApp() {
    try {
      await this.storage.create();
    } catch (error) {
      console.error('Storage initialization error:', error);
    }
  }
}