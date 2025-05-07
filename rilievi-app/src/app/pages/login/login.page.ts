import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

const API_URL = 'https://rilievi-perizie-0ldb.onrender.com/api';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule]
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage!: string;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController,
    private http: HttpClient
  ) { }

  ngOnInit() {

    // Pulisci il token all'avvio della pagina login
    this.authService.logout();
    
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    
    // Test connessione al server
    this.testServerConnection();
    
    // Commenta o rimuovi questo controllo per evitare il redirect automatico
    /*
    this.authService.isAuthenticated().subscribe(isAuth => {
      if (isAuth) {
        this.router.navigateByUrl('/home', { replaceUrl: true });
      }
    });
    */
  }

  testServerConnection() {
    this.http.get(`${API_URL}/health`, { responseType: 'text' })
      .pipe(
        timeout(5000),
        catchError(() => {
          this.errorMessage = '';
          return of(null);
        })
      )
      .subscribe();
  }

  async login() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    this.errorMessage = '';  // Resetta eventuali errori precedenti
    console.log('Tentativo di login con:', this.loginForm.value);
    
    // Sostituisci toPromise() con la sottoscrizione diretta
    this.authService.login(this.loginForm.value).subscribe({
      next: (response) => {
        console.log('Login riuscito:', response);
        this.isLoading = false;
        this.router.navigateByUrl('/home', { replaceUrl: true });
      },
      error: async (error) => {
        console.error('Login fallito:', error);
        this.errorMessage = error.message || 'Si è verificato un errore durante il login';
        this.isLoading = false;
        
        const alert = await this.alertController.create({
          header: 'Errore di accesso',
          message: error?.error?.message || 'Username o password non validi. Riprova.',
          buttons: ['OK']
        });
        await alert.present();
      }
    });
  }
}