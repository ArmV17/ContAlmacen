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
  logOutOutline, // Añadimos este para cerrar sesión
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
   * Se usa en el HTML con *ngIf para mostrar/ocultar la opción de Administración.
   */
  esAdmin(): boolean {
    const rol = localStorage.getItem('userRol');
    return rol === 'Admin';
  }

  /**
   * Verifica si existe una sesión activa.
   * Sirve para ocultar el menú lateral por completo cuando el usuario está en el Login.
   */
  sesionIniciada(): boolean {
    return localStorage.getItem('userRol') !== null;
  }

  /**
   * Borra los datos del localStorage y redirige al Login.
   */
  cerrarSesion() {
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}