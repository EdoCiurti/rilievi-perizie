import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

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

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    
    // Controlla se già autenticato
    this.authService.isAuthenticated().subscribe(isAuth => {
      if (isAuth) {
        this.router.navigateByUrl('/home', { replaceUrl: true });
      }
    });
  }

  async login() {
    if (this.loginForm.invalid) return;
    
    this.isLoading = true;
    
    try {
      await this.authService.login(this.loginForm.value).toPromise();
      this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error) {
      console.error('Login failed', error);
      const alert = await this.alertController.create({
        header: 'Errore',
        message: 'Username o password non validi',
        buttons: ['OK']
      });
      await alert.present();
    } finally {
      this.isLoading = false;
    }
  }
}