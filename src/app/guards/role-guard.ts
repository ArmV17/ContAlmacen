import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

// Este protege las rutas internas (Dashboard, Inventario, etc.)
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const rol = localStorage.getItem('userRol');

  if (rol) {
    return true;
  } else {
    router.navigate(['/login'], { replaceUrl: true });
    return false;
  }
};

// ESTE ES EL QUE TE FALTA EXPORTAR
// Este evita que vuelvan al Login si ya están logueados
export const loginGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const rol = localStorage.getItem('userRol');

  if (rol) {
    // Si ya tiene sesión, lo mandamos adentro según su rol
    if (rol === 'Admin') {
      router.navigate(['/administracion'], { replaceUrl: true });
    } else {
      router.navigate(['/dashboard'], { replaceUrl: true });
    }
    return false;
  }
  return true;
};