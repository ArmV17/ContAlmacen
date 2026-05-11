import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  qrCodeOutline, arrowUndoOutline, calendarOutline, 
  checkmarkDoneCircleOutline, personOutline, buildOutline,
  barcodeOutline, ellipseOutline, checkmarkCircle
} from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-devoluciones',
  templateUrl: './devoluciones.page.html',
  styleUrls: ['./devoluciones.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DevolucionesPage implements OnInit {

  busquedaId: string = '';
  prestamosAgrupados: any[] = [];
  prestamosRespaldo: any[] = [];
  cargando: boolean = false;

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ 
      qrCodeOutline, arrowUndoOutline, calendarOutline, 
      checkmarkDoneCircleOutline, personOutline, buildOutline,
      barcodeOutline, ellipseOutline, checkmarkCircle
    });
  }

  async ngOnInit() {
    await this.cargarYAgruparPrestamos();
  }

  /**
   * Obtiene todos los préstamos activos y los agrupa por Receptor + Fecha
   */
  async cargarYAgruparPrestamos() {
    this.cargando = true;
    try {
      const data: any[] = await this.almacenService.obtenerTodosLosPrestamosActivos();
      
      const grupos: { [key: string]: any } = {};

      data.forEach((p: any) => {
        const fechaCorta = this.formatearFechaCorta(p.fecha_prestamo);
        const llave = `${p.receptor_id}_${fechaCorta}`;

        if (!grupos[llave]) {
          grupos[llave] = {
            receptor_id: p.receptor_id,
            receptor_nombre: p.receptor_nombre,
            receptor_tipo: p.receptor_tipo,
            fecha_display: p.fecha_prestamo,
            inputValidacion: '', // Texto que escribe el almacenista
            todoValidado: false, // Habilita el botón de Recibir
            datos_devolucion: []
          };
        }
        
        // Estructura de cada item dentro del grupo
        grupos[llave].datos_devolucion.push({
          prestamoId: p.id,
          herramientaId: p.herramienta_id_db,
          codigo: p.herramienta_codigo,
          nombre: p.herramienta_nombre,
          validado: false // Cambia a true al escanear/digitar
        });
      });

      this.prestamosAgrupados = Object.values(grupos);
      this.prestamosRespaldo = [...this.prestamosAgrupados];
    } catch (error) {
      console.error("Error al agrupar préstamos:", error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Compara el código ingresado con las herramientas del grupo
   */
  validarHerramientaEnGrupo(grupo: any) {
    const codigoIngresado = grupo.inputValidacion.trim().toUpperCase();
    if (!codigoIngresado) return;

    // Buscamos una coincidencia en el grupo que no haya sido validada aún
    const herramienta = grupo.datos_devolucion.find((h: any) => 
      h.codigo.toUpperCase() === codigoIngresado && !h.validado
    );

    if (herramienta) {
      herramienta.validado = true;
      grupo.inputValidacion = ''; // Limpiamos para el siguiente escaneo
      this.mostrarMensaje(`Validado: ${herramienta.nombre}`, 'success');
      
      // Verificamos si ya terminamos con todas las herramientas de este grupo
      grupo.todoValidado = grupo.datos_devolucion.every((h: any) => h.validado);
    }
  }

  /**
   * Procesa la devolución masiva del grupo validado
   */
  async recibirTodo(grupo: any) {
    this.cargando = true;
    let exitos = 0;

    try {
      for (const item of grupo.datos_devolucion) {
        const res = await this.almacenService.registrarDevolucion(item.prestamoId, item.herramientaId);
        if (res.exito) exitos++;
      }

      if (exitos > 0) {
        this.mostrarMensaje(`¡Éxito! Se recibieron ${exitos} herramientas.`, 'success');
        await this.cargarYAgruparPrestamos(); // Refrescar lista
      }
    } catch (error) {
      this.mostrarMensaje('Error al procesar la devolución', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Auxiliares
   */
  formatearFechaCorta(f: any): string {
    const d = f?.toDate ? f.toDate() : new Date(f);
    return d.toISOString().split('T')[0];
  }

  filtrarLista() {
    const busqueda = this.busquedaId.trim().toLowerCase();
    if (!busqueda) {
      this.prestamosAgrupados = this.prestamosRespaldo;
      return;
    }
    this.prestamosAgrupados = this.prestamosRespaldo.filter(g => 
      g.receptor_id.toLowerCase().includes(busqueda) || 
      g.receptor_nombre.toLowerCase().includes(busqueda)
    );
  }

  escanearCodigo(event?: any) {
    if (event) {
      event.stopPropagation(); // Evita que el clic llegue a la lista
    }
    this.mostrarMensaje('Iniciando escáner...', 'primary');
  }

  async mostrarMensaje(m: string, c: string) {
    const toast = await this.toastController.create({
      message: m,
      duration: 2000,
      color: c,
      position: 'bottom'
    });
    toast.present();
  }
}
