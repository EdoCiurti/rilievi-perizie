import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController, IonicModule } from '@ionic/angular';
import { PerizieService } from '../../services/perizie.service';
import { FotoService } from '../../services/foto.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-nuova-perizia',
  templateUrl: './nuova-perizia.page.html',
  styleUrls: ['./nuova-perizia.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, FormsModule]
})
export class NuovaPeriziaPage implements OnInit {
  periziaForm!: FormGroup;
  isSubmitting = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private perizieService: PerizieService,
    public fotoService: FotoService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.periziaForm = this.formBuilder.group({
      descrizione: ['', Validators.required],
      cliente: ['', Validators.required],
      indirizzo: ['', Validators.required]
    });
  }

  async aggiungiImmagine() {
    try {
      await this.fotoService.addNewPhoto();
    } catch (error) {
      console.error('Errore acquisizione foto', error);
      const toast = await this.toastController.create({
        message: 'Errore durante l\'acquisizione della foto',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
    }
  }

  rimuoviFoto(index: number) {
    this.fotoService.photos.splice(index, 1);
  }

  async inviaPeriza() {
    if (this.periziaForm.invalid) {
      return;
    }

    if (this.fotoService.photos.length === 0) {
      const alert = await this.alertController.create({
        header: 'Attenzione',
        message: 'È necessario aggiungere almeno una foto alla perizia',
        buttons: ['OK']
      });
      await alert.present();
      return;
    }

    this.isSubmitting = true;

    const loading = await this.loadingController.create({
      message: 'Creazione perizia in corso...',
      spinner: 'dots'
    });
    await loading.present();

    try {
      await this.perizieService.creaPerizia(
        this.periziaForm.value.descrizione,
        this.periziaForm.value.cliente,
        this.periziaForm.value.indirizzo
      );

      // Reset del form e delle foto
      this.periziaForm.reset();
      this.fotoService.photos = [];

      const toast = await this.toastController.create({
        message: 'Perizia creata con successo',
        duration: 2000,
        color: 'success'
      });
      toast.present();

      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Errore creazione perizia', error);
      const alert = await this.alertController.create({
        header: 'Errore',
        message: 'Si è verificato un errore durante la creazione della perizia',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isSubmitting = false;
      await loading.dismiss();
    }
  }
}