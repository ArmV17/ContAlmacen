import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { 
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
  IonButton, IonIcon, IonSearchbar, IonContent, IonAccordionGroup, 
  IonAccordion, IonItem, IonLabel 
} from '@ionic/angular/standalone';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addIcons } from 'ionicons';
import { 
  constructOutline, barcodeOutline, searchOutline, fingerPrintOutline, 
  hammerOutline, chevronDownOutline, chevronUpOutline, chevronDownCircle,
  chevronUpCircle, cloudUploadOutline, imageOutline, cameraOutline, downloadOutline
} from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonButton, IonIcon, IonSearchbar, IonContent, IonAccordionGroup, 
    IonAccordion, IonItem, IonLabel
  ]
})
export class InventarioPage {

  herramientasOriginales: any[] = [];
  herramientasAgrupadas: any[] = [];
  inventarioFiltrado: any[] = []; // Variable de estado para los resultados
  textoBuscar: string = '';

  constructor(private almacenService: AlmacenService) {
    addIcons({ 
      constructOutline, barcodeOutline, searchOutline, fingerPrintOutline, 
      hammerOutline, chevronDownOutline, chevronUpOutline, chevronDownCircle,
      chevronUpCircle, cloudUploadOutline, imageOutline, cameraOutline, downloadOutline
    });
  }

  async ionViewWillEnter() {
    await this.cargarInventario();
  }

  async cargarInventario() {
    this.herramientasOriginales = await this.almacenService.obtenerInventario();
    this.procesarInventario();
    this.inventarioFiltrado = [...this.herramientasAgrupadas]; // Inicializar
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
          imagenAI: h.url_imagen || 'assets/ai_icon.png',
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

  // Método optimizado: Se ejecuta solo al interactuar con el buscador
  buscarHerramienta(event: any) {
    const t = (event.detail.value || '').toLowerCase().trim();
    this.textoBuscar = t;

    if (!t) {
      this.inventarioFiltrado = this.herramientasAgrupadas;
      return;
    }

    this.inventarioFiltrado = this.herramientasAgrupadas.reduce((resultados, grupo) => {
      const coincideNombre = grupo.nombre.toLowerCase().includes(t);
      const nuevoGrupo = { ...grupo, detallesPorTipo: [] as any[] };
      let hayCoincidenciaInterna = false;

      grupo.detallesPorTipo.forEach((detalle: any) => {
        const nombreYTipo = `${grupo.nombre} ${detalle.tipo}`.toLowerCase();
        const coincideNombreTipo = nombreYTipo.includes(t);
        const itemsPorEstado = detalle.items.filter((item: any) => item.estado.toLowerCase().includes(t));

        if (coincideNombreTipo || itemsPorEstado.length > 0) {
          nuevoGrupo.detallesPorTipo.push({
            ...detalle,
            items: itemsPorEstado.length > 0 ? itemsPorEstado : detalle.items,
            disponibles: detalle.items.filter((i: any) => i.estado.toLowerCase() === 'disponible').length
          });
          hayCoincidenciaInterna = true;
        }
      });

      if (coincideNombre && !hayCoincidenciaInterna) {
        resultados.push(grupo);
      } else if (hayCoincidenciaInterna) {
        nuevoGrupo.totalDisponibles = nuevoGrupo.detallesPorTipo.reduce((acc: number, det: any) => acc + det.disponibles, 0);
        resultados.push(nuevoGrupo);
      }
      return resultados;
    }, []);
  }

  // Método trackBy para optimizar el rendimiento del *ngFor
  trackByNombre(index: number, item: any) {
    return item.nombre;
  }

  generarPDFInventario() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX');
    const hora = new Date().toLocaleTimeString('es-MX');
    const generadoPor = "Jose Leonardo Villa Padron"; 

    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80);
    doc.text('REPORTE DE INVENTARIO', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Universidad Autónoma Agraria Antonio Narro`, 14, 27);
    doc.setFontSize(9);
    doc.text(`Generado por: ${generadoPor}`, 14, 34);
    doc.text(`Fecha de emisión: ${fecha} | ${hora}`, 14, 39);
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    const cuerpoTabla: any[] = [];
    this.herramientasAgrupadas.forEach((herramienta: any) => {
      herramienta.detallesPorTipo.forEach((detalle: any) => {
        cuerpoTabla.push([herramienta.nombre, detalle.items.length]);
      });
    });

    autoTable(doc, {
      startY: 48,
      head: [['Descripción de la Herramienta', 'Cantidad']],
      body: cuerpoTabla,
      theme: 'striped'
    });

    doc.save(`Reporte_Inventario_${fecha.replace(/\//g, '-')}.pdf`);
  }
}