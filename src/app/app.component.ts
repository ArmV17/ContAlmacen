import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
// Importamos RouterModule para que funcionen los enlaces del menú
import { RouterModule } from '@angular/router'; 

// Íconos para nuestro menú lateral
import { addIcons } from 'ionicons';
import { homeOutline, addCircleOutline, checkmarkCircleOutline, listOutline, settingsOutline } from 'ionicons/icons';
addIcons({ homeOutline, addCircleOutline, checkmarkCircleOutline, listOutline, settingsOutline });
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, RouterModule],
})
export class AppComponent {
  constructor() {
    // Registramos los íconos
    addIcons({ homeOutline, addCircleOutline, checkmarkCircleOutline, listOutline });
  }
}