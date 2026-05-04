import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'nuevo-prestamo',
    loadComponent: () => import('./pages/nuevo-prestamo/nuevo-prestamo.page').then( m => m.NuevoPrestamoPage)
  },
  {
    path: 'devoluciones',
    loadComponent: () => import('./pages/devoluciones/devoluciones.page').then( m => m.DevolucionesPage)
  },
  {
    path: 'inventario',
    loadComponent: () => import('./pages/inventario/inventario.page').then( m => m.InventarioPage)
  },
];
