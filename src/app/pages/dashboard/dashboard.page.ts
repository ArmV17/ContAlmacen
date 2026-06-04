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

  configurarCabeceraPDF(doc: any, titulo: string, usuario: string) {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Fechas y horas dinámicas
    const fechaActual = new Date();
    const fechaHora = fechaActual.toLocaleDateString('es-MX') + ' ' + 
                      fechaActual.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    // 1. LOGOS EN BASE64
    const logoIzquierdoBase64 = 'data:image/png;base64, PEGA_AQUI_EL_LOGO_UAAAN'; 
    const logoDerecha1Base64 = 'data:image/png;base64, PEGA_AQUI_EL_LOGO_DERECHO_1'; 
    const logoDerecha2Base64 = 'data:image/png;base64, PEGA_AQUI_EL_LOGO_DERECHO_2'; 

    try {
      // Logo Narro (Izquierda)
      doc.addImage(logoIzquierdoBase64, 'PNG', 15, 10, 22, 26);
      
      // Logos Secretaría/Departamento (Derecha)
      doc.addImage(logoDerecha1Base64, 'PNG', pageWidth - 55, 12, 18, 18);
      doc.addImage(logoDerecha2Base64, 'PNG', pageWidth - 32, 12, 18, 18);
    } catch (e) {
      console.warn('Error al cargar los logos.');
    }

    // 2. MEMBRETE OFICIAL CENTRAL
    doc.setTextColor(0, 0, 0); 
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Universidad Autónoma Agraria Antonio Narro', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('DIVISIÓN DE INGENIERÍA', pageWidth / 2, 20, { align: 'center' });
    doc.text('DEPARTAMENTO DE CIENCIAS DEL SUELO', pageWidth / 2, 25, { align: 'center' });

    // Textos de contacto más pequeños para que luzca como el original
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Calzada Antonio Narro No. 1923, Colonia Buenavista', pageWidth / 2, 30, { align: 'center' });
    doc.text('Saltillo, Coahuila, México. C.P. 25315', pageWidth / 2, 34, { align: 'center' });
    doc.text('Tel. (844) 411 02 00 Ext. 1936, 1937', pageWidth / 2, 38, { align: 'center' });
    doc.text('e-mail: suelos@uaaan.edu.mx   Página Web: www.uaaan.edu.mx', pageWidth / 2, 42, { align: 'center' });

    // 3. LÍNEA SEPARADORA
    doc.setLineWidth(0.5);
    doc.line(15, 45, pageWidth - 15, 45);

    // 4. DATOS DE GENERACIÓN Y TÍTULO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    // Título centrado
    doc.text(titulo, pageWidth / 2, 54, { align: 'center' });

    // Usuario y Fecha a la derecha, debajo de la línea
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Generado por: ${usuario}`, pageWidth - 15, 51, { align: 'right' });
    doc.text(`Fecha y hora: ${fechaHora}`, pageWidth - 15, 56, { align: 'right' });
  }

  generarPDFGeneral() {
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' = Landscape (Horizontal)
    const hoy = new Date().toLocaleDateString('es-MX');
    const empleadoActual = localStorage.getItem('userName') || 'Admin';

    this.configurarCabeceraPDF(doc, 'REPORTE GENERAL DE ALMACÉN', empleadoActual);

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
      head: [['Alumno', 'Matrícula', 'Carrera', 'Herramientas', 'Fecha', 'Prestó', 'Estado']],
      body: filas,
      startY: 62, // Empezar la tabla en Y=62 para que no toque el título (Y=38)
      theme: 'striped',
      styles: { fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [0, 0, 0] } 
    });

    doc.save(`Reporte_General_${hoy.replace(/\//g, '-')}.pdf`);
  }
  
  generarPDFVencidos() {
    const doc = new jsPDF('l', 'mm', 'a4'); // 'l' = Landscape (Horizontal)
    const hoy = new Date().toLocaleDateString('es-MX');
    const empleadoActual = localStorage.getItem('userName') || 'Admin';

    this.configurarCabeceraPDF(doc, 'REPORTE DE PRÉSTAMOS VENCIDOS', empleadoActual);

    const vencidos = this.prestamosOriginales.filter(p => p.estado === 'Vencido');
    const mapaAgrupado = new Map();

    vencidos.forEach(p => {
      const fecha = p.fecha_devolucion_pactada?.toDate().toLocaleDateString('es-MX') || 'N/A';
      const llave = `${p.receptor_id}_${fecha}`;

      if (mapaAgrupado.has(llave)) {
        mapaAgrupado.get(llave).herramientas.push(p.herramienta_nombre);
      } else {
        mapaAgrupado.set(llave, {
          nombre: p.receptor_nombre,
          id: p.receptor_id,
          herramientas: [p.herramienta_nombre],
          fecha: fecha,
          prestó: p.empleado_almacen || 'Admin'
        });
      }
    });

    const filas = Array.from(mapaAgrupado.values()).map((g: any) => [
      g.nombre, g.id, g.herramientas.join(', '), g.fecha, g.prestó
    ]);

    autoTable(doc, {
      head: [['Alumno', 'Matrícula', 'Carrera', 'Herramientas (Vencidas)', 'Vencimiento', 'Prestó']],
      body: filas,
      startY: 62, // Empezar la tabla en Y=62 para que no toque el título (Y=38)
      theme: 'striped',
      styles: { fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [0, 0, 0] } 
    });

    doc.save(`Reporte_Vencidos_${hoy.replace(/\//g, '-')}.pdf`);
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