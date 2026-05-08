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
    const fecha = new Date().toLocaleDateString('es-MX'); // Formato México
    const hora = new Date().toLocaleTimeString('es-MX');

    // --- CONFIGURACIÓN DE ENCABEZADO ---
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('REPORTE DE INVENTARIO', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha de emisión: ${fecha} | ${hora}`, 14, 28);
    doc.text('Universidad Autónoma Agraria Antonio Narro', 14, 33);

    const cuerpoTabla: any[] = [];

    // --- LÓGICA DE PROCESAMIENTO DE DATOS ---
    this.herramientasAgrupadas.forEach((herramienta: any) => {
      
      herramienta.detallesPorTipo.forEach((detalle: any) => {
        
        let nombreBase = herramienta.nombre.trim();
        let tipoTexto = detalle.tipo ? detalle.tipo.trim() : '';
        let nombreFinal = nombreBase;

        const nombreLower = nombreBase.toLowerCase();
        const tipoLower = tipoTexto.toLowerCase();

        // Validar que el tipo exista y no sea el valor por defecto
        if (tipoTexto && tipoLower !== 'normal' && tipoLower !== 'sin tipo' && tipoLower !== '') {
          
          // 1. Evitar redundancia (Si el nombre ya contiene el tipo, no lo repetimos)
          if (!nombreLower.includes(tipoLower)) {
            
            // 2. Lógica de conectores inteligentes
            let conector = ' de ';
            
            // Caso A: Si es un adjetivo descriptivo
            const adjetivos = ['largo', 'larga', 'corto', 'corta', 'grande', 'chico', 'chica', 'nuevo', 'viejo', 'usado'];
            if (adjetivos.includes(tipoLower)) {
              conector = ' ';
            }

            // Caso B: Si el tipo ya empieza con "de " o "del "
            if (tipoLower.startsWith('de ') || tipoLower.startsWith('del ')) {
              conector = ' ';
            }
            
            // Caso C: Si el tipo empieza con un número (ej. "3 metros")
            // Agregamos " de " solo si el nombre base no termina ya en preposición
            if (!isNaN(parseInt(tipoTexto.charAt(0))) && !nombreLower.endsWith(' de')) {
              conector = ' de ';
            }

            nombreFinal = `${nombreBase}${conector}${tipoTexto}`;
          }
        }

        // 3. Añadir a la lista del PDF
        cuerpoTabla.push([
          nombreFinal,
          detalle.items.length // Cantidad de unidades
        ]);
      });
    });

    // --- GENERACIÓN DE LA TABLA ---
    autoTable(doc, {
      startY: 40,
      head: [['Descripción de la Herramienta', 'Cantidad']],
      body: cuerpoTabla,
      theme: 'striped',
      headStyles: {
        fillColor: [44, 62, 80], // Azul noche profesional
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
        }
    });

    // --- GUARDAR ARCHIVO ---
    // Reemplazamos las barras de la fecha para evitar problemas en Windows/Android
    const nombreArchivo = `Reporte_Inventario_${fecha.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  }
}