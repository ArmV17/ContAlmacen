import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 
import { IonicModule } from '@ionic/angular';

// Importación de íconos
import { addIcons } from 'ionicons';
import { 
  homeOutline, 
  addCircleOutline, 
  checkmarkCircleOutline, 
  listOutline, 
  settingsOutline,
  logOutOutline, 
  businessOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
})
export class AppComponent {
  
  constructor(private router: Router) {
    // Registramos todos los íconos necesarios para el menú lateral
    addIcons({ 
      homeOutline, 
      addCircleOutline, 
      checkmarkCircleOutline, 
      listOutline, 
      settingsOutline, 
      logOutOutline,
      businessOutline 
    });
  }

  /**
   * Verifica si el usuario logueado es Administrador.
   * Si el rol es 'Staff', devolverá false y ocultará la opción en el HTML.
   */
  esAdmin(): boolean {
    const rol = localStorage.getItem('userRol');
    return rol === 'Admin';
  }

  obtenerNombreUsuario(): string {
    return localStorage.getItem('userName') || 'Usuario';
  }
  /**
   * Verifica si existe una sesión activa para mostrar u ocultar el menú lateral.
   */
  sesionIniciada(): boolean {
    return localStorage.getItem('userRol') !== null;
  }

  /**
   * Limpia la sesión y redirige al Login reemplazando la URL en el historial.
   */
  cerrarSesion() {
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}