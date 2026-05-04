import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// En Ionic 8+, los íconos se importan y registran manualmente para optimizar la app
import { addIcons } from 'ionicons';
import { buildOutline, add } from 'ionicons/icons';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true, // Esto es clave en las nuevas versiones
  imports: [IonicModule, CommonModule, FormsModule] // Aquí le decimos que use Ionic y *ngFor
})
export class DashboardPage implements OnInit {

  prestamosActivos = [
    {
      alumno: 'Juan Pérez',
      matricula: '17001122',
      carrera: 'Mantenimiento',
      herramienta: 'Multímetro Fluke',
      fechaPrestamo: '2026-05-04',
      estado: 'A tiempo'
    },
    {
      alumno: 'María Gómez',
      matricula: '17003344',
      carrera: 'Mecatrónica',
      herramienta: 'Cautín de estación',
      fechaPrestamo: '2026-05-01',
      estado: 'Vencido'
    }
  ];

  constructor() { 
    // Registramos los íconos que usamos en el HTML
    addIcons({ buildOutline, add });
  }

  ngOnInit() {
  }

}