import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InventarioPage {

  herramientasOriginales: any[] = []; // Datos brutos de Firebase
  herramientasAgrupadas: any[] = []; // Datos para mostrar en la lista
  textoBuscar: string = '';

  constructor(private almacenService: AlmacenService) {}

  async ionViewWillEnter() {
    await this.cargarInventario();
  }

  async cargarInventario() {
    this.herramientasOriginales = await this.almacenService.obtenerInventario();
    this.procesarInventario();
  }

  // Agrupa por nombre y cuenta existencias
  procesarInventario() {
    const mapa = new Map();

    this.herramientasOriginales.forEach(h => {
      const nombre = h.nombre_herramienta;
      // Si no tiene tipo, lo clasificamos como 'Normal'
      const tipo = h.tipo_herramienta || 'Normal';

      if (!mapa.has(nombre)) {
        mapa.set(nombre, {
          nombre: nombre,
          detallesPorTipo: [] // Aquí guardaremos los conteos por tipo
        });
      }

      const grupo = mapa.get(nombre);
      
      // Buscar si ya existe este tipo dentro del grupo
      let subGrupo = grupo.detallesPorTipo.find((t: any) => t.tipo === tipo);
      
      if (!subGrupo) {
        subGrupo = { tipo: tipo, total: 0, disponibles: 0 };
        grupo.detallesPorTipo.push(subGrupo);
      }

      subGrupo.total++;
      if (h.estado === 'Disponible') {
        subGrupo.disponibles++;
      }
    });

    this.herramientasAgrupadas = Array.from(mapa.values());
  }

  // Getter para filtrar por nombre o tipo
  get inventarioFiltrado() {
    const t = this.textoBuscar.toLowerCase().trim();
    return this.herramientasAgrupadas.filter(g => 
      g.nombre.toLowerCase().includes(t) || 
      g.tipo.toLowerCase().includes(t)
    );
  }

  buscarHerramienta(event: any) {
    this.textoBuscar = event.detail.value;
  }
}