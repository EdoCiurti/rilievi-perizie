import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    // Cambia loadChildren a loadComponent per componenti standalone
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage),
    canActivate: [AuthGuard]
  },
  {
    path: 'nuova-perizia',
    loadComponent: () => import('./pages/nuova-perizia/nuova-perizia.page').then(m => m.NuovaPeriziaPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'dettaglio-perizia/:id',
    loadComponent: () => import('./pages/dettaglio-perizia/dettaglio-perizia.page').then(m => m.DettaglioPeriziaPage),
    canActivate: [AuthGuard]
  }
];