import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  imageOutline ,
  cameraOutline,
  downloadOutline
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
      imageOutline ,
      cameraOutline,
      downloadOutline
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
          imagenAI: h.url_imagen || 'assets/ai_icon.png', // Si hay URL en la DB la usa, si no, el icono
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

  generarPDFInventario() {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX');
    const hora = new Date().toLocaleTimeString('es-MX');
    
    // --- NUEVO: DEFINIR QUIÉN GENERA EL PDF ---
    const generadoPor = "Jose Leonardo Villa Padron"; 

    // --- CONFIGURACIÓN DE ENCABEZADO ---
    doc.setFontSize(18);
    doc.setTextColor(44, 62, 80); // Color azul noche profesional
    doc.text('REPORTE DE INVENTARIO', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Universidad Autónoma Agraria Antonio Narro`, 14, 27);
    
    // --- LÍNEAS DE EMISIÓN Y GENERADOR ---
    doc.setFontSize(9);
    doc.text(`Generado por: ${generadoPor}`, 14, 34);
    doc.text(`Fecha de emisión: ${fecha} | ${hora}`, 14, 39);

    // Línea divisoria estética
    doc.setDrawColor(44, 62, 80);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    const cuerpoTabla: any[] = [];

    // --- LÓGICA DE PROCESAMIENTO DE DATOS ---
    this.herramientasAgrupadas.forEach((herramienta: any) => {
      herramienta.detallesPorTipo.forEach((detalle: any) => {
        let nombreBase = herramienta.nombre.trim();
        let tipoTexto = detalle.tipo ? detalle.tipo.trim() : '';
        let nombreFinal = nombreBase;

        const nombreLower = nombreBase.toLowerCase();
        const tipoLower = tipoTexto.toLowerCase();

        if (tipoTexto && tipoLower !== 'normal' && tipoLower !== 'sin tipo' && tipoLower !== '') {
          if (!nombreLower.includes(tipoLower)) {
            let conector = ' de ';
            const adjetivos = ['largo', 'larga', 'corto', 'corta', 'grande', 'chico', 'chica', 'nuevo', 'viejo', 'usado'];
            if (adjetivos.includes(tipoLower)) { conector = ' '; }
            if (tipoLower.startsWith('de ') || tipoLower.startsWith('del ')) { conector = ' '; }
            if (!isNaN(parseInt(tipoTexto.charAt(0))) && !nombreLower.endsWith(' de')) { conector = ' de '; }

            nombreFinal = `${nombreBase}${conector}${tipoTexto}`;
          }
        }

        cuerpoTabla.push([
          nombreFinal,
          detalle.items.length 
        ]);
      });
    });

    // --- GENERACIÓN DE LA TABLA ---
    autoTable(doc, {
      startY: 48, // Aumentado para dar espacio a la info del emisor
      head: [['Descripción de la Herramienta', 'Cantidad']],
      body: cuerpoTabla,
      theme: 'striped',
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255],
        fontSize: 11,
        halign: 'left'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        1: { halign: 'center', cellWidth: 35, fontStyle: 'bold' }
      },
      margin: { top: 40 },
      didDrawPage: (data) => {
          const totalPaginas = (doc as any).internal.pages.length - 1;
          const str = 'Página ' + totalPaginas;
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();

          doc.setFontSize(9);
          doc.setTextColor(150);
          doc.text(str, data.settings.margin.left, pageHeight - 10);
          
          // Opcional: repetir el nombre del emisor en el pie de página
          doc.text(`Reporte generado por ${generadoPor}`, 140, pageHeight - 10);
        }
    });

    const nombreArchivo = `Reporte_Inventario_${fecha.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }
}