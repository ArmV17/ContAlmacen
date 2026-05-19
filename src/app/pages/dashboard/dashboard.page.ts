import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';

// 👇 1. IMPORTACIONES STANDALONE DE TODOS LOS COMPONENTES DE TU HTML
import { 
  ToastController, LoadingController,
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
  IonButton, IonIcon, IonPopover, IonContent, IonList, IonItem, 
  IonLabel, IonRefresher, IonRefresherContent, IonGrid, IonRow, 
  IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
  IonBadge, IonFab, IonFabButton
} from '@ionic/angular/standalone'; 

import { addIcons } from 'ionicons';
import { 
  buildOutline, menu, alertCircleOutline, mailOutline, 
  sendOutline, personOutline, schoolOutline, checkmarkDoneCircleOutline,
  personCircleOutline, school, downloadOutline, businessOutline, briefcaseOutline
} from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

// Librerías para PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  // 👇 2. DECLARACIÓN EXPLÍCITA PARA QUE VERCEL NO BORRE EL DISEÑO
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonButton, IonIcon, IonPopover, IonContent, IonList, IonItem, 
    IonLabel, IonRefresher, IonRefresherContent, IonGrid, IonRow, 
    IonCol, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
    IonBadge, IonFab, IonFabButton
  ]
})
export class DashboardPage {

  prestamosOriginales: any[] = []; 
  prestamosAgrupados: any[] = []; 
  vencidosAgrupados: any[] = [];   
  activosAgrupados: any[] = [];    
  totalVencidos: number = 0;       

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { 
    addIcons({ 
      buildOutline, menu, alertCircleOutline, mailOutline, 
      sendOutline, personOutline, 
      schoolOutline, school,
      checkmarkDoneCircleOutline, personCircleOutline,
      downloadOutline, businessOutline, briefcaseOutline
    });
  }

  async ionViewWillEnter() {
    await this.cargarDashboard();
  }

  async cargarDashboard() {
    try {
      const datos = await this.almacenService.obtenerPrestamosDashboard();
      this.prestamosOriginales = datos;
      
      const grupos: { [key: string]: any } = {};
      this.totalVencidos = 0;

      datos.forEach((p: any) => {
        const nombreEmp = p.empleado_almacen || 'Admin Almacén';
        const estadoP = p.estado || 'Activo';
        
        let deptoVisual = p.autorizado_por_depto || 'S/D';
        
        if (deptoVisual && deptoVisual.startsWith('U2Fsd')) {
          try {
            deptoVisual = this.almacenService.desencriptarTexto(deptoVisual);
          } catch (e) {
            console.error("No se pudo desencriptar el departamento:", deptoVisual);
          }
        }

        const llave = `${p.receptor_id}_${nombreEmp}_${estadoP}`;

        if (!grupos[llave]) {
          grupos[llave] = {
            receptor_id: p.receptor_id,
            receptor_nombre: p.receptor_nombre || 'Sin Nombre',
            receptor_tipo: p.receptor_tipo || 'Alumno',
            receptor_correo: p.receptor_correo,
            receptor_info_extra: p.receptor_info_extra || 'N/A',
            autorizado_por_nombre: p.autorizado_por_nombre || 'N/A',
            autorizado_por_depto: deptoVisual, 
            empleado_nombre: nombreEmp, 
            fecha_devolucion_pactada: p.fecha_devolucion_pactada?.toDate(),
            estadoGeneral: estadoP,
            herramientas: []
          };
        }

        grupos[llave].herramientas.push({
          nombre: p.herramienta_nombre,
          estadoIndividual: estadoP 
        });
      });

      this.prestamosAgrupados = Object.values(grupos);
      this.vencidosAgrupados = this.prestamosAgrupados.filter((g: any) => g.estadoGeneral === 'Vencido');
      this.activosAgrupados = this.prestamosAgrupados.filter((g: any) => g.estadoGeneral === 'Activo');
      this.totalVencidos = datos.filter(p => p.estado === 'Vencido').length;

    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    }
  }

  async lanzarAlertasManuales() {
    const loading = await this.loadingController.create({ 
      message: 'Preparando notificaciones...' 
    });
    await loading.present();

    try {
      const hoy = new Date();
      const hoyTimestamp = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

      const mapaAgrupado: { [key: string]: any } = {};

      this.prestamosOriginales.forEach(p => {
        if (p.estado === 'Devuelto') return;

        const correoDestino = p.receptor_correo || p.correo;
        if (!correoDestino || correoDestino.includes('sin_correo')) return;

        const fechaDoc = p.fecha_devolucion_pactada.toDate();
        const fechaPrestamoTimestamp = new Date(fechaDoc.getFullYear(), fechaDoc.getMonth(), fechaDoc.getDate()).getTime();

        if (fechaPrestamoTimestamp <= hoyTimestamp) {
          
          if (!mapaAgrupado[correoDestino]) {
            mapaAgrupado[correoDestino] = {
              correo: correoDestino,
              to_email: correoDestino,
              nombre: p.receptor_nombre,
              correoProfesor: p.autorizado_por_correo || '', 
              nombreProfesor: p.autorizado_por_nombre || 'Docente Encargado',
              vencidas: [],
              hoy: [],
              tieneRetraso: false
            };
          }

          if (fechaPrestamoTimestamp < hoyTimestamp) {
            mapaAgrupado[correoDestino].vencidas.push(`• ${p.herramienta_nombre}`);
            mapaAgrupado[correoDestino].tieneRetraso = true;
          } else {
            mapaAgrupado[correoDestino].hoy.push(`• ${p.herramienta_nombre}`);
          }
        }
      });

      const listaFinalParaEnviar = Object.values(mapaAgrupado).map((c: any) => {
        let htmlDiseno = "";
        if (c.hoy.length > 0) {
          htmlDiseno += `<b>ENTREGAR HOY:</b><br>${c.hoy.join('<br>')}<br>`;
        }
        if (c.vencidas.length > 0) {
          htmlDiseno += `<b style="color:red;">VENCIDO:</b><br>${c.vencidas.join('<br>')}`;
        }

        return {
          correo: c.correo,
          to_email: c.correo,
          nombre: c.nombre,
          correoProfesor: c.correoProfesor, 
          nombreProfesor: c.nombreProfesor,
          herramienta: htmlDiseno, 
          esRetraso: c.tieneRetraso
        };
      });

      if (listaFinalParaEnviar.length === 0) {
        this.mostrarMensaje('No se detectaron préstamos para hoy o vencidos', 'medium');
        loading.dismiss();
        return;
      }

      await this.almacenService.enviarAlertasMasivas(listaFinalParaEnviar);
      this.mostrarMensaje(`Se enviaron ${listaFinalParaEnviar.length} notificaciones`, 'success');

    } catch (error) {
      console.error("Error en envío masivo:", error);
      this.mostrarMensaje('Error al conectar con el servidor', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  generarPDFGeneral() {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const hoy = new Date().toLocaleDateString('es-MX');
    this.configurarCabeceraPDF(doc, 'REPORTE GENERAL DE ALMACÉN', hoy, "Jose Leonardo Villa Padron");

    const mapaAgrupado = new Map();
    this.prestamosOriginales.forEach(p => {
      const fecha = p.fecha_devolucion_pactada?.toDate().toLocaleDateString('es-MX') || 'N/A';
      const llave = `${p.receptor_id}_${fecha}_${p.estado}`;

      if (mapaAgrupado.has(llave)) {
        mapaAgrupado.get(llave).herramientas.push(p.herramienta_nombre);
      } else {
        mapaAgrupado.set(llave, {
          nombre: p.receptor_nombre,
          id: p.receptor_id,
          info: p.receptor_info_extra || 'N/A',
          herramientas: [p.herramienta_nombre],
          fecha: fecha,
          prestó: p.empleado_almacen || 'Admin',
          estado: (p.estado || 'Activo').toUpperCase()
        });
      }
    });

    const filas = Array.from(mapaAgrupado.values()).map((g: any) => [
      g.nombre, g.id, g.info, g.herramientas.join(', '), g.fecha, g.prestó, g.estado
    ]);

    autoTable(doc, {
      head: [['Nombre', 'ID', 'Info', 'Herramientas', 'Fecha', 'Prestó', 'Estado']],
      body: filas,
      startY: 45,
      theme: 'striped',
      styles: { fontSize: 8, halign: 'center' }
    });

    doc.save(`Reporte_General_${hoy}.pdf`);
  }

  generarPDFVencidos() {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    const hoy = new Date().toLocaleDateString('es-MX');
    this.configurarCabeceraPDF(doc, 'REPORTE DE VENCIDOS', hoy, "Jose Leonardo Villa Padron");

    const vencidos = this.prestamosOriginales.filter(p => p.estado === 'Vencido');
    const filas = vencidos.map(p => [
      p.receptor_nombre, p.receptor_id, p.herramienta_nombre, 
      p.fecha_devolucion_pactada?.toDate().toLocaleDateString('es-MX'), p.empleado_almacen
    ]);

    autoTable(doc, {
      head: [['Nombre', 'ID', 'Herramienta', 'Vencimiento', 'Prestó']],
      body: filas,
      startY: 45,
      styles: { halign: 'center' },
      headStyles: { fillColor: [153, 27, 27] }
    });

    doc.save(`Reporte_Vencidos_${hoy}.pdf`);
  }

  private configurarCabeceraPDF(doc: jsPDF, titulo: string, fecha: string, emisor: string) {
    doc.setFontSize(18);
    doc.text('UAAAN - Control de Almacén', 14, 15);
    doc.setFontSize(10);
    doc.text(`${titulo} | Generado por: ${emisor} | Fecha: ${fecha}`, 14, 25);
    doc.line(14, 30, 283, 30);
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({ message: mensaje, duration: 3000, color: color });
    await toast.present();
  }

  async doRefresh(event: any) {
    await this.cargarDashboard();
    event.target.complete();
  }
}