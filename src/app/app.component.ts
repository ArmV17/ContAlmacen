import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 

// 👇 IMPORTAMOS TODO, INCLUYENDO ION-TEXT E ION-BADGE QUE VIMOS EN EL HTML
import { 
  IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, 
  IonTitle, IonContent, IonList, IonMenuToggle, IonItem, 
  IonIcon, IonLabel, IonSplitPane, IonText, IonBadge
} from '@ionic/angular/standalone';

// Importación de íconos
import { addIcons } from 'ionicons';
import { 
  homeOutline, addCircleOutline, checkmarkCircleOutline, 
  listOutline, settingsOutline, logOutOutline, businessOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  // 👇 REGISTRAMOS CADA ETIQUETA AQUÍ
  imports: [
    CommonModule, 
    RouterModule,
    IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, 
    IonTitle, IonContent, IonList, IonMenuToggle, IonItem, 
    IonIcon, IonLabel, IonSplitPane, IonText, IonBadge
  ],
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

  esAdmin(): boolean {
    const rol = localStorage.getItem('userRol');
    return rol === 'Admin';
  }

  obtenerNombreUsuario(): string {
    return localStorage.getItem('userName') || 'Usuario';
  }
  
  sesionIniciada(): boolean {
    return localStorage.getItem('userRol') !== null;
  }

  cerrarSesion() {
    localStorage.clear();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}