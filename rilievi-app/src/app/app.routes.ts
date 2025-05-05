import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then( m => m.HomePageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'nuova-perizia',
    loadChildren: () => import('./pages/nuova-perizia/nuova-perizia.module').then( m => m.NuovaPeriziaPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'dettaglio-perizia/:id',
    loadChildren: () => import('./pages/dettaglio-perizia/dettaglio-perizia.module').then( m => m.DettaglioPeriziaPageModule),
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }