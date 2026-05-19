import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/role-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login', 
    pathMatch: 'full',
  },
  {
    path: 'login',
    // Si ya tiene sesión, el loginGuard lo rebota al Dashboard/Administración
    //canActivate: [loginGuard], // <-- APÁGALO TEMPORALMENTE
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'dashboard',
    // Solo entra si existe un rol en localStorage
    canActivate: [authGuard], 
    loadComponent: () => import('./pages/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'nuevo-prestamo',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/nuevo-prestamo/nuevo-prestamo.page').then( m => m.NuevoPrestamoPage)
  },
  {
    path: 'devoluciones',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/devoluciones/devoluciones.page').then( m => m.DevolucionesPage)
  },
  {
    path: 'inventario',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inventario/inventario.page').then( m => m.InventarioPage)
  },
  {
    path: 'administracion',
    // Protegido: Solo personal logueado puede intentar entrar aquí
    canActivate: [authGuard], 
    loadComponent: () => import('./pages/administracion/administracion.page').then( m => m.AdministracionPage)
  },
  // Ruta comodín para redirigir cualquier error al login
  {
    path: '**',
    redirectTo: 'login'
  }
];