import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController, IonInput } from '@ionic/angular';
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

  // Foco global de búsqueda de matrícula
  @ViewChild('inputBusquedaGlobal') inputBusquedaGlobal!: IonInput;
  
  // Lista dinámica de los inputs de herramientas dentro de cada tarjeta
  @ViewChildren('inputEscaneoHerramienta') inputsEscaneoHerramientas!: QueryList<IonInput>;

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

  async ionViewDidEnter() {
    await this.cargarYAgruparPrestamos();
    setTimeout(() => this.inputBusquedaGlobal?.setFocus(), 500);
  }

  async ngOnInit() {
    // La carga se movió a ionViewDidEnter
  }

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

  // --- NUEVA LÓGICA DE SALTO DE FOCO ---
  filtrarLista(eventoEnter: boolean = false) {
    // Protección contra undefined
    const busqueda = (this.busquedaId || '').trim().toLowerCase();
    
    if (!busqueda) {
      this.prestamosAgrupados = this.prestamosRespaldo;
      return;
    }
    
    this.prestamosAgrupados = this.prestamosRespaldo.filter(g => 
      g.receptor_id.toLowerCase().includes(busqueda) || 
      g.receptor_nombre.toLowerCase().includes(busqueda)
    );

    if (eventoEnter && this.prestamosAgrupados.length > 0) {
      setTimeout(() => {
        const primerInputHerramienta = this.inputsEscaneoHerramientas.first;
        if (primerInputHerramienta) {
          primerInputHerramienta.setFocus();
        }
      }, 300);
    } else if (eventoEnter && this.prestamosAgrupados.length === 0) {
       this.mostrarMensaje('No se encontró al deudor', 'warning');
       
       // SOLUCIÓN: Forzar la limpieza de manera asíncrona
       setTimeout(() => {
         this.busquedaId = '';
         this.inputBusquedaGlobal?.setFocus();
       }, 50);
    }
  }

  // ==========================================

  validarHerramientaEnGrupo(grupo: any) {
    // Evitar escaneos basura si el sistema está procesando datos (falla de internet)
    if (this.cargando) {
       this.mostrarMensaje('Procesando, por favor espere...', 'warning');
       setTimeout(() => { grupo.inputValidacion = ''; }, 50);
       return;
    }

    // Protección para evitar que .toUpperCase() rompa la app si el input llega vacío
    const inputBruto = grupo.inputValidacion || '';
    const codigo = inputBruto.toUpperCase().trim();

    if (!codigo) return;

    const herramienta = grupo.datos_devolucion.find((h: any) => h.codigo === codigo);

    if (herramienta) {
      if (!herramienta.validado) {
        herramienta.validado = true;
        this.mostrarMensaje(`Validado: ${herramienta.nombre}`, 'success');
      }
      this.actualizarEstadosGrupo(grupo);
    } else {
       this.mostrarMensaje('Código no pertenece a este deudor', 'danger');
    }

    // SOLUCIÓN AL BUG PRINCIPAL:
    // Al usar setTimeout aseguramos que Ionic borre el texto *después* de procesar el input, 
    // evitando que se amontonen los códigos.
    setTimeout(() => {
      grupo.inputValidacion = '';
      
      const index = this.prestamosAgrupados.findIndex(g => g.receptor_id === grupo.receptor_id);
      if (index !== -1) {
         const inputCorrespondiente = this.inputsEscaneoHerramientas.toArray()[index];
         if(inputCorrespondiente) inputCorrespondiente.setFocus();
      }
    }, 50);
  }

  actualizarEstadosGrupo(grupo: any) {
    grupo.alMenosUnaValidada = grupo.datos_devolucion.some((h: any) => h.validado);
    grupo.todoValidado = grupo.datos_devolucion.every((h: any) => h.validado);
  }

  async devolverUna(grupo: any, herramienta: any) {
    this.cargando = true;
    try {
      const res = await this.almacenService.registrarDevolucion(herramienta.prestamoId, herramienta.herramientaId);
      if (res.exito) {
        this.mostrarMensaje(`Entregada: ${herramienta.nombre}`, 'success');
        
        grupo.datos_devolucion = grupo.datos_devolucion.filter((h: any) => h.prestamoId !== herramienta.prestamoId);
        this.actualizarEstadosGrupo(grupo);
        
        if (grupo.datos_devolucion.length === 0) {
          this.prestamosAgrupados = this.prestamosAgrupados.filter(g => g.receptor_id !== grupo.receptor_id);
          // Limpiamos de forma segura
          setTimeout(() => {
            this.busquedaId = '';
            this.inputBusquedaGlobal?.setFocus();
          }, 500);
        }
      }
    } catch (e) {
      this.mostrarMensaje('Error al procesar devolución', 'danger');
    } finally {
      this.cargando = false;
    }
  }

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
          grupo.datos_devolucion = grupo.datos_devolucion.filter((item: any) => item.prestamoId !== h.prestamoId);
        }
      }

      this.mostrarMensaje(`Se entregaron ${exitos} herramientas correctamente`, 'success');
      
      if (grupo.datos_devolucion.length === 0) {
        this.prestamosAgrupados = this.prestamosAgrupados.filter(g => g.receptor_id !== grupo.receptor_id);
        setTimeout(() => {
          this.busquedaId = ''; 
          this.inputBusquedaGlobal?.setFocus();
        }, 500);
      }
      
      this.actualizarEstadosGrupo(grupo);
    } catch (error) {
      this.mostrarMensaje('Error en proceso masivo', 'danger');
    } finally {
      this.cargando = false;
    }
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