import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  qrCodeOutline, arrowUndoOutline, calendarOutline, 
  checkmarkDoneCircleOutline, personOutline, buildOutline,
  barcodeOutline, ellipseOutline, checkmarkCircle, searchOutline,
  timeOutline, checkmarkDoneOutline
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
      barcodeOutline, ellipseOutline, checkmarkCircle, searchOutline,
      timeOutline, checkmarkDoneOutline
    });
  }

  async ngOnInit() {
    await this.cargarYAgruparPrestamos();
  }

  /**
   * Obtiene todos los préstamos activos y los agrupa por Receptor
   */
  async cargarYAgruparPrestamos() {
    this.cargando = true;
    try {
      const data: any[] = await this.almacenService.obtenerTodosLosPrestamosActivos();
      
      const grupos: { [key: string]: any } = {};

      data.forEach((p: any) => {
        const llave = p.receptor_id;

        if (!grupos[llave]) {
          grupos[llave] = {
            receptor_id: p.receptor_id,
            receptor_nombre: p.receptor_nombre,
            receptor_tipo: p.receptor_tipo,
            inputValidacion: '', 
            todoValidado: false,
            alMenosUnaValidada: false,
            datos_devolucion: []
          };
        }
        
        grupos[llave].datos_devolucion.push({
          prestamoId: p.id,
          herramientaId: p.herramienta_id_db,
          codigo: p.herramienta_codigo,
          nombre: p.herramienta_nombre,
          validado: false 
        });
      });

      this.prestamosAgrupados = Object.values(grupos);
      this.prestamosRespaldo = [...this.prestamosAgrupados];
    } catch (error) {
      console.error("Error al cargar deudores:", error);
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Valida la herramienta. 
   * Convierte a MAYÚSCULAS automáticamente al escribir o escanear con el Alacrity.
   */
  validarHerramientaEnGrupo(grupo: any) {
    // Normalización inmediata a Mayúsculas
    grupo.inputValidacion = grupo.inputValidacion.toUpperCase().trim();
    const codigo = grupo.inputValidacion;

    if (!codigo) return;

    // Buscamos la herramienta en el préstamo de esta persona
    const herramienta = grupo.datos_devolucion.find((h: any) => h.codigo === codigo);

    if (herramienta) {
      if (!herramienta.validado) {
        herramienta.validado = true;
        this.mostrarMensaje(`Validado: ${herramienta.nombre}`, 'success');
      }
      
      // Limpiamos el campo para el siguiente escaneo automático
      grupo.inputValidacion = '';
      this.actualizarEstadosGrupo(grupo);
    }
  }

  /**
   * Actualiza los estados de los botones del grupo
   */
  actualizarEstadosGrupo(grupo: any) {
    grupo.alMenosUnaValidada = grupo.datos_devolucion.some((h: any) => h.validado);
    grupo.todoValidado = grupo.datos_devolucion.every((h: any) => h.validado);
  }

  /**
   * Devolución Parcial/Individual: Entrega solo una herramienta específica
   */
  async devolverUna(grupo: any, herramienta: any) {
    this.cargando = true;
    try {
      const res = await this.almacenService.registrarDevolucion(herramienta.prestamoId, herramienta.herramientaId);
      if (res.exito) {
        this.mostrarMensaje(`Entregada: ${herramienta.nombre}`, 'success');
        
        // La quitamos de la lista visual
        grupo.datos_devolucion = grupo.datos_devolucion.filter((h: any) => h.prestamoId !== herramienta.prestamoId);
        this.actualizarEstadosGrupo(grupo);
        
        // Si no quedan más herramientas, borramos el grupo de la vista
        if (grupo.datos_devolucion.length === 0) {
          this.prestamosAgrupados = this.prestamosAgrupados.filter(g => g.receptor_id !== grupo.receptor_id);
        }
      }
    } catch (e) {
      this.mostrarMensaje('Error al procesar devolución', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Devolución de Selección: Entrega todas las marcadas en verde.
   * Si faltan herramientas, estas se quedan en la lista como pendientes.
   */
  async recibirSeleccion(grupo: any) {
    const seleccionadas = grupo.datos_devolucion.filter((h: any) => h.validado);
    if (seleccionadas.length === 0) return;

    this.cargando = true;
    let exitos = 0;

    try {
      for (const h of seleccionadas) {
        const res = await this.almacenService.registrarDevolucion(h.prestamoId, h.herramientaId);
        if (res.exito) {
          exitos++;
          // Quitamos las herramientas procesadas de la lista
          grupo.datos_devolucion = grupo.datos_devolucion.filter((item: any) => item.prestamoId !== h.prestamoId);
        }
      }

      this.mostrarMensaje(`Se entregaron ${exitos} herramientas correctamente`, 'success');
      
      // Si el deudor ya no debe nada, quitamos el grupo
      if (grupo.datos_devolucion.length === 0) {
        this.prestamosAgrupados = this.prestamosAgrupados.filter(g => g.receptor_id !== grupo.receptor_id);
      }
      
      this.actualizarEstadosGrupo(grupo);
    } catch (error) {
      this.mostrarMensaje('Error en proceso masivo', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  /**
   * Filtrar deudores por ID o Nombre
   */
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
    if (event) event.stopPropagation();
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

  obtenerConteoValidados(grupo: any): number {
    if (!grupo || !grupo.datos_devolucion) return 0;
    return grupo.datos_devolucion.filter((h: any) => h.validado).length;
  }
}