import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { searchOutline, buildOutline, menu } from 'ionicons/icons';

// Importamos el servicio
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InventarioPage {

  // Lista original que viene de Supabase
  herramientas: any[] = [];
  // Lista que se mostrará en pantalla (afectada por el buscador)
  herramientasFiltradas: any[] = [];

  constructor(private almacenService: AlmacenService) {
    addIcons({ searchOutline, buildOutline, menu });
  }

  // Cargamos los datos cada vez que el usuario entra a la pantalla
  async ionViewWillEnter() {
    await this.cargarInventario();
  }

  async cargarInventario() {
    // Usamos el método que ya habíamos creado en el servicio
    const datos = await this.almacenService.obtenerInventario();
    this.herramientas = datos as any[];
    this.herramientasFiltradas = this.herramientas; // Al inicio mostramos todas
  }

  // Método que se ejecuta cada vez que el usuario escribe en la barra de búsqueda
  buscarHerramienta(event: any) {
    const textoBuscado = event.target.value.toLowerCase();

    // Si el buscador está vacío, restauramos la lista original
    if (!textoBuscado || textoBuscado.trim() === '') {
      this.herramientasFiltradas = this.herramientas;
      return;
    }

    // Filtramos buscando coincidencias en el nombre o en el código (número de herramienta)
    this.herramientasFiltradas = this.herramientas.filter(item => {
      const nombre = item.nombre_herramienta ? item.nombre_herramienta.toLowerCase() : '';
      const codigo = item.num_herramienta ? item.num_herramienta.toLowerCase() : '';
      
      return nombre.includes(textoBuscado) || codigo.includes(textoBuscado);
    });
  }
}