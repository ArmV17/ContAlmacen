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

  // --- LÓGICA DE SALTO DE FOCO ---
  filtrarLista(eventoEnter: boolean = false) {
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
       
       setTimeout(() => {
         this.busquedaId = '';
         this.inputBusquedaGlobal?.setFocus();
       }, 50);
    }
  }

  // ==========================================
  // VALIDACIÓN INTELIGENTE AUTOMÁTICA
  // ==========================================
  validarHerramientaEnGrupo(grupo: any) {
    if (this.cargando) return;

    const inputBruto = grupo.inputValidacion || '';
    const codigoIngresado = inputBruto.toUpperCase().trim();

    if (!codigoIngresado) return;

    // Buscamos si existe una herramienta en este grupo cuyo código coincida exactamente
    const herramientaEncontrada = grupo.datos_devolucion.find(
      (h: any) => h.codigo.toUpperCase().trim() === codigoIngresado
    );

    // Si coincide exactamente de manera automática al escribir o escanear
    if (herramientaEncontrada) {
      if (!herramientaEncontrada.validado) {
        herramientaEncontrada.validado = true;
        this.mostrarMensaje(`Validado: ${herramientaEncontrada.nombre}`, 'success');
      }
      this.actualizarEstadosGrupo(grupo);

      // Limpiamos el input de inmediato y pasamos al siguiente foco o limpiamos para el próximo escaneo
      setTimeout(() => {
        grupo.inputValidacion = '';
        
        const index = this.prestamosAgrupados.findIndex(g => g.receptor_id === grupo.receptor_id);
        if (index !== -1) {
           const inputCorrespondiente = this.inputsEscaneoHerramientas.toArray()[index];
           if(inputCorrespondiente) inputCorrespondiente.setFocus();
        }
      }, 50);
    } else {
      // Si el texto escrito ya es largo (por ejemplo, igual o mayor a la longitud de los códigos) 
      // y aun así no coincide con ninguno, avisamos que no pertenece.
      // Esto evita que marque error mientras vas escribiendo la letra "P", "PA", etc.
      const longitudPromedioCodigo = grupo.datos_devolucion[0]?.codigo?.length || 6;
      
      if (codigoIngresado.length >= longitudPromedioCodigo) {
        this.mostrarMensaje('Código no pertenece a este deudor', 'danger');
        setTimeout(() => {
          grupo.inputValidacion = '';
        }, 100);
      }
    }
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