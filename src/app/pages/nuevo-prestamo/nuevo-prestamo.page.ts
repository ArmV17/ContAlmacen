import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  saveOutline, personOutline, buildOutline, barcodeOutline, 
  menu, alertCircle, checkmarkCircle, sendOutline, 
  qrCodeOutline, hammerOutline, trashOutline, addOutline, 
  constructOutline, addCircleOutline, listOutline, trashBinOutline,
  chevronDownOutline, chevronUpOutline, refreshOutline
} from 'ionicons/icons';

// Importamos el servicio
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-nuevo-prestamo',
  templateUrl: './nuevo-prestamo.page.html',
  styleUrls: ['./nuevo-prestamo.page.scss'],
  standalone: true, 
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NuevoPrestamoPage implements OnInit {

  // Referencias de los inputs
  @ViewChild('inputMatricula') inputMatricula!: IonInput;
  @ViewChild('inputFecha') inputFecha!: IonInput; // Agregado para controlar el calendario
  @ViewChild('inputHerramienta') inputHerramienta!: IonInput;

  // Estructura del préstamo
  prestamo: any = {
    tipoReceptor: 'alumno',   
    identificador: '',        
    nombreReceptor: '',
    profesorAutoriza: null, 
    materia: '',
    fechaEntrega: ''
  };

  // Variables de control
  hoy = new Date().toISOString();
  receptorEncontrado: any = null;
  listaMaestros: any[] = [];
  materiasFiltradas: string[] = [];
  
  // Inventario y Carrito
  codigoBusqueda: string = '';
  herramientaEncontrada: any = null;
  listaInventario: any[] = [];
  carritoHerramientas: any[] = []; 
  cantidadPrestamosActuales: number = 0;

  empleadoActual = localStorage.getItem('userName') || 'Admin';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, menu, alertCircle, 
      checkmarkCircle, sendOutline, qrCodeOutline, hammerOutline, trashOutline, 
      addOutline, constructOutline, addCircleOutline, listOutline, trashBinOutline,
      chevronDownOutline, chevronUpOutline, refreshOutline
    });
  }

  async ngOnInit() {
    await this.cargarInventario();
    await this.cargarMaestros();
    
    // Autofocus al cargar la página en la matrícula
    setTimeout(() => this.inputMatricula?.setFocus(), 500);
  }

  async cargarInventario() {
    try { this.listaInventario = await this.almacenService.obtenerInventario(); } catch (e) { console.error(e); }
  }

  async cargarMaestros() {
    try { this.listaMaestros = await this.almacenService.obtenerMaestros(); } catch (e) { console.error(e); }
  }

  // ==========================================
  // FLUJO DE INTERACCIÓN SECUENCIAL
  // ==========================================

  async alValidarMatricula() {
    // Al dar Enter en la matrícula, solo validamos
    await this.verificarReceptor();
  }

  onProfesorChange() {
    if (this.prestamo.profesorAutoriza) {
      this.materiasFiltradas = this.prestamo.profesorAutoriza.materias || [];
      this.prestamo.materia = ''; 
    }
  }

  alSeleccionarMateria() {
    // Cuando el usuario elige la materia, mandamos a abrir el calendario de la fecha
    setTimeout(() => {
      this.abrirCalendario();
    }, 400); 
  }

  async abrirCalendario() {
    try {
      const nativeInput = await this.inputFecha.getInputElement();
      if (nativeInput && typeof nativeInput.showPicker === 'function') {
        nativeInput.showPicker();
      }
    } catch (e) {
      console.log("No se pudo desplegar el calendario nativo", e);
    }
  }

  alSeleccionarFecha() {
    // Al elegir la fecha, saltamos directamente al escáner de herramientas
    if (this.prestamo.fechaEntrega) {
      setTimeout(() => this.inputHerramienta?.setFocus(), 300);
    }
  }

  // ==========================================
  // LÓGICA DE NEGOCIO Y PRÉSTAMOS
  // ==========================================

  async verificarReceptor() {
    const id = this.prestamo.identificador.trim();
    this.receptorEncontrado = null;

    if (id.length < 1) return;

    const tieneCorreoValido = (usuario: any) => {
      if (usuario.correo && usuario.correo.toLowerCase().startsWith('sin_correo')) {
        this.mostrarMensaje('Usuario con correo no válido (sin_correo)', 'danger');
        return false;
      }
      return true;
    };

    if (this.prestamo.tipoReceptor === 'alumno') {
      if (id.length >= 8 && /^\d+$/.test(id)) { 
        const alumno = await this.almacenService.buscarAlumnoPorMatricula(id);
        if (alumno && tieneCorreoValido(alumno)) {
          this.receptorEncontrado = alumno;
          this.prestamo.nombreReceptor = alumno.nombre;
          this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
        }
      }
    } else {
      const prof = this.listaMaestros.find(p => String(p.num_maestro).trim() === String(id));
      if (prof && tieneCorreoValido(prof)) {
        this.receptorEncontrado = prof;
        this.prestamo.nombreReceptor = prof.nombre;
        this.materiasFiltradas = prof.materias || [];
        this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
      }
    }
  }

  async buscarHerramientaEscaneada() {
    if (!this.receptorEncontrado) {
      this.mostrarMensaje('Primero identifica al receptor', 'warning');
      this.codigoBusqueda = '';
      return;
    }

    if (!this.codigoBusqueda) return;

    await this.buscarHerramienta();

    if (this.herramientaEncontrada) {
      this.agregarAlCarrito(); 
    } else {
      this.codigoBusqueda = '';
      this.inputHerramienta?.setFocus();
    }
  }

  async buscarHerramienta() {
    const encontrada = this.listaInventario.find(h => h.num_herramienta.toUpperCase() === this.codigoBusqueda.trim().toUpperCase());
    
    if (encontrada) {
      this.herramientaEncontrada = encontrada;
      if (encontrada.prestada || encontrada.estado === 'Prestado') {
        this.mostrarMensaje('Esta herramienta ya está prestada.', 'warning');
        this.herramientaEncontrada = null;
      } else if (encontrada.estado === 'Mantenimiento') {
        this.mostrarMensaje('Herramienta en mantenimiento.', 'warning');
        this.herramientaEncontrada = null;
      }
    } else {
      this.mostrarMensaje('Herramienta no disponible o inexistente', 'warning');
      this.herramientaEncontrada = null;
    }
  }

  agregarAlCarrito() {
    if (!this.herramientaEncontrada) return;

    const existe = this.carritoHerramientas.find(h => h.num_herramienta === this.herramientaEncontrada.num_herramienta);
    if (existe) {
      this.mostrarMensaje('Ya agregaste esta herramienta.', 'warning');
      this.codigoBusqueda = '';
      this.inputHerramienta?.setFocus();
      return;
    }

    let tieneLimite = true;
    if (this.prestamo.tipoReceptor === 'profesor' && this.receptorEncontrado?.departamento === 'CIENCIAS DEL SUELO') {
      tieneLimite = false;
    }

    if (tieneLimite && (this.cantidadPrestamosActuales + this.carritoHerramientas.length) >= 5) {
      this.mostrarMensaje('Límite de 5 herramientas alcanzado.', 'danger');
      this.codigoBusqueda = '';
      this.inputHerramienta?.setFocus();
      return;
    }

    this.carritoHerramientas.push(this.herramientaEncontrada);
    this.mostrarMensaje(`${this.herramientaEncontrada.nombre_herramienta} en lista`, 'success');
    
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    setTimeout(() => this.inputHerramienta?.setFocus(), 100);
  }

  quitarDelCarrito(index: number) {
    this.carritoHerramientas.splice(index, 1);
  }

  async finalizarPrestamo() {
    if (this.receptorEncontrado?.correo?.toLowerCase().startsWith('sin_correo')) {
       this.mostrarMensaje('Acción bloqueada: Correo no válido registrado.', 'danger');
       return;
    }

    if (this.carritoHerramientas.length === 0 || !this.prestamo.materia || !this.prestamo.fechaEntrega) {
      this.mostrarMensaje('Completa los datos y la lista.', 'warning');
      return;
    }

    const autorizador = this.prestamo.tipoReceptor === 'alumno' 
      ? this.prestamo.profesorAutoriza 
      : this.receptorEncontrado;

    let exitos = 0;
    for (const h of this.carritoHerramientas) {
      const payload = {
        esProfesor: this.prestamo.tipoReceptor === 'profesor',
        receptor: {
          id: this.prestamo.identificador,
          nombre: this.prestamo.nombreReceptor,
          info_extra: this.prestamo.tipoReceptor === 'alumno' ? this.receptorEncontrado.carrera : 'Personal Docente'
        },
        autorizador: {
          num_empleado: autorizador?.num_maestro || 'S/N',
          nombre: autorizador?.nombre || 'Auto-autorizado',
          departamento: autorizador?.departamento || 'N/A'
        },
        herramienta: h,
        materia: this.prestamo.materia,
        fechaEntrega: this.prestamo.fechaEntrega,
        empleadoAlmacen: this.empleadoActual
      };

      const resultado = await this.almacenService.registrarNuevoPrestamoDetallado(payload);
      
      if (resultado.exito) {
        exitos++;
        const index = this.listaInventario.findIndex(item => item.id === h.id);
        if (index !== -1) {
          this.listaInventario[index].prestada = true;
          this.listaInventario[index].estado = 'Prestado';
        }
      }
    }

    if (exitos === this.carritoHerramientas.length) {
      this.mostrarMensaje(`¡${exitos} préstamos registrados!`, 'success');
      this.limpiarFormulario();
    } else {
      this.mostrarMensaje('Error en algunos registros.', 'danger');
      await this.cargarInventario();
    }
  }

  limpiarFormulario() {
    this.prestamo = { 
      tipoReceptor: this.prestamo.tipoReceptor,
      identificador: '', 
      nombreReceptor: '', 
      profesorAutoriza: null, 
      materia: '', 
      fechaEntrega: '' 
    };
    this.receptorEncontrado = null;
    this.carritoHerramientas = [];
    this.cantidadPrestamosActuales = 0;
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.materiasFiltradas = [];

    setTimeout(() => this.inputMatricula?.setFocus(), 500);
  }

  async mostrarMensaje(m: string, c: string) {
    const t = await this.toastController.create({ message: m, duration: 2000, color: c, position: 'bottom' });
    t.present();
  }
}