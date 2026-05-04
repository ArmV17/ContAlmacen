import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

// Importamos íconos
import { addIcons } from 'ionicons';
import { searchOutline, buildOutline, addOutline } from 'ionicons/icons';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InventarioPage implements OnInit {

  // Simulamos el catálogo de herramientas
  herramientas = [
    { id: 'MULT-04', nombre: 'Multímetro Fluke', categoria: 'Medición', estado: 'Prestado' },
    { id: 'CAUT-01', nombre: 'Cautín de estación', categoria: 'Soldadura', estado: 'Disponible' },
    { id: 'PINZ-09', nombre: 'Pinza Amperimétrica', categoria: 'Medición', estado: 'Mantenimiento' },
    { id: 'OSC-02', nombre: 'Osciloscopio Digital', categoria: 'Laboratorio', estado: 'Disponible' },
    { id: 'PUL-01', nombre: 'Pulidora Angular', categoria: 'Mecánica', estado: 'Prestado' }
  ];

  constructor() {
    addIcons({ searchOutline, buildOutline, addOutline });
  }

  ngOnInit() {
  }

}