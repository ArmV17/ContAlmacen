import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  constructOutline, 
  barcodeOutline, 
  searchOutline, 
  fingerPrintOutline, 
  hammerOutline,
  chevronDownOutline,
  chevronUpOutline,
  chevronDownCircle,
  chevronUpCircle,
  cloudUploadOutline,
  imageOutline 
} from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class InventarioPage {

  herramientasOriginales: any[] = [];
  herramientasAgrupadas: any[] = [];
  textoBuscar: string = '';

  constructor(private almacenService: AlmacenService) {
    addIcons({ 
      constructOutline, 
      barcodeOutline, 
      searchOutline, 
      fingerPrintOutline, 
      hammerOutline,
      chevronDownOutline,
      chevronUpOutline,
      chevronDownCircle,
      chevronUpCircle,
      cloudUploadOutline,
      imageOutline 
    });
  }

  async ionViewWillEnter() {
    await this.cargarInventario();
  }

  async cargarInventario() {
    this.herramientasOriginales = await this.almacenService.obtenerInventario();
    this.procesarInventario();
  }

  procesarInventario() {
    const mapa = new Map();
    this.herramientasOriginales.forEach(h => {
      const nombre = h.nombre_herramienta;
      const tipo = h.tipo_herramienta || 'Normal';

      if (!mapa.has(nombre)) {
        mapa.set(nombre, {
          nombre: nombre,
          totalDisponibles: 0,
          imagenAI: 'assets/ai_icon.png',
          mostrarDetalles: false,
          detallesPorTipo: [] 
        });
      }

      const grupo = mapa.get(nombre);
      let subGrupo = grupo.detallesPorTipo.find((t: any) => t.tipo === tipo);
      
      if (!subGrupo) {
        subGrupo = { tipo: tipo, disponibles: 0, items: [] };
        grupo.detallesPorTipo.push(subGrupo);
      }

      subGrupo.items.push({
        num_herramienta: h.num_herramienta,
        estado: h.estado || 'Disponible'
      });

      if (h.estado === 'Disponible') {
        subGrupo.disponibles++;
        grupo.totalDisponibles++;
      }
    });
    this.herramientasAgrupadas = Array.from(mapa.values());
  }

  async seleccionarImagen(herramienta: any) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          herramienta.imagenAI = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  // --- LÓGICA DE FILTRADO OPTIMIZADA ---
  get inventarioFiltrado() {
    const t = this.textoBuscar.toLowerCase().trim();
    
    if (!t) return this.herramientasAgrupadas;

    const resultados: any[] = [];

    this.herramientasAgrupadas.forEach(grupo => {
      const coincideNombre = grupo.nombre.toLowerCase().includes(t);
      const nuevoGrupo = { ...grupo, detallesPorTipo: [] as any[] };
      let hayCoincidenciaInterna = false;

      grupo.detallesPorTipo.forEach((detalle: any) => {
        const nombreYTipo = `${grupo.nombre} ${detalle.tipo}`.toLowerCase();
        const coincideNombreTipo = nombreYTipo.includes(t);

        // Filtramos unidades por estado
        const itemsPorEstado = detalle.items.filter((item: any) => 
          item.estado.toLowerCase().includes(t)
        );

        if (coincideNombreTipo || itemsPorEstado.length > 0) {
          nuevoGrupo.detallesPorTipo.push({
            ...detalle,
            // Si buscamos por estado, mostramos solo esos items. Si no, mostramos todos los de ese tipo.
            items: itemsPorEstado.length > 0 ? itemsPorEstado : detalle.items,
            disponibles: detalle.items.filter((i: any) => i.estado.toLowerCase() === 'disponible').length
          });
          hayCoincidenciaInterna = true;
        }
      });

      if (coincideNombre && !hayCoincidenciaInterna) {
        resultados.push(grupo);
      } else if (hayCoincidenciaInterna) {
        // Recalculamos stock disponible basado en los tipos filtrados
        nuevoGrupo.totalDisponibles = nuevoGrupo.detallesPorTipo.reduce((acc: number, det: any) => acc + det.disponibles, 0);
        resultados.push(nuevoGrupo);
      }
    });

    return resultados;
  }

  obtenerTodasLasUnidades(herramienta: any) {
    const todas: any[] = [];
    herramienta.detallesPorTipo.forEach((detalle: any) => {
      todas.push(...detalle.items);
    });
    return todas;
  }

  buscarHerramienta(event: any) {
    this.textoBuscar = event.detail.value || '';
  }
}