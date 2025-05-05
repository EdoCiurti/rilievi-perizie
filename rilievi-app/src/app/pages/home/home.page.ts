import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { PerizieService } from '../../services/perizie.service';
import { CommonModule } from '@angular/common';
import { Perizia } from '../models/perizia.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class HomePage implements OnInit {
  perizie: any[] = [];
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private perizieService: PerizieService,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    this.caricaPerizie();
  }

  ionViewWillEnter() {
    // Ricarica i dati ogni volta che la pagina appare
    this.caricaPerizie();
  }

  caricaPerizie() {
    this.isLoading = true;
    this.perizieService.getPerizie().subscribe(
      (data) => {
        this.perizie = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Errore caricamento perizie', error);
        this.isLoading = false;
      }
    );
  }

  doRefresh(event: RefresherCustomEvent) {
    this.perizieService.getPerizie().subscribe(
      (data: Perizia[]) => {
        this.perizie = data;
        event.target.complete();
      },
      (error: any) => {
        console.error('Errore refresh perizie', error);
        event.target.complete();
      }
    );
  }

  nuovaPerizia() {
    this.router.navigate(['/nuova-perizia']);
  }

  apriDettaglio(id: string) {
    this.router.navigate(['/dettaglio-perizia', id]);
  }

  getColorByStato(stato: string): string {
    switch (stato?.toLowerCase()) {
      case 'completata':
        return 'success';
      case 'in corso':
        return 'primary';
      case 'in attesa':
        return 'warning';
      default:
        return 'medium';
    }
  }

  async confermaEliminazione(id: string) {
    const alert = await this.alertController.create({
      header: 'Conferma eliminazione',
      message: 'Sei sicuro di voler eliminare questa perizia?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: () => {
            this.eliminaPerizia(id);
          }
        }
      ]
    });

    await alert.present();
  }

  eliminaPerizia(id: string) {
    this.isLoading = true;
    this.perizieService['eliminaPerizia'](id).subscribe(
      () => {
        this.perizie = this.perizie.filter(p => p._id !== id);
        this.isLoading = false;
      },
      (error: any) => {
        console.error('Errore eliminazione perizia', error);
        this.isLoading = false;
      }
    );
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Sei sicuro di voler uscire?',
      buttons: [
        {
          text: 'Annulla',
          role: 'cancel'
        },
        {
          text: 'Esci',
          handler: async () => {
            await this.authService.logout();
            this.router.navigateByUrl('/login', { replaceUrl: true });
          }
        }
      ]
    });

    await alert.present();
  }
}