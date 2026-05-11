import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  saveOutline, personOutline, buildOutline, barcodeOutline, 
  menu, alertCircle, checkmarkCircle, sendOutline, 
  qrCodeOutline, hammerOutline, trashOutline, addOutline, 
  constructOutline, addCircleOutline, listOutline, trashBinOutline,
  chevronDownOutline, chevronUpOutline
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

  // Estructura del préstamo (Modelo de la vista)
  prestamo: any = {
    tipoReceptor: 'alumno',   // 'alumno' o 'profesor'
    identificador: '',        // Matrícula o N° Empleado
    nombreReceptor: '',
    profesorAutoriza: null,   // Ahora manejamos el objeto completo del maestro
    materia: '',
    fechaEntrega: ''
  };

  // Variables de control y datos
  hoy = new Date().toISOString();
  receptorEncontrado: any = null;
  listaMaestros: any[] = [];
  materiasFiltradas: string[] = [];
  
  // Inventario y Carrito
  codigoBusqueda: string = '';
  herramientaEncontrada: any = null;
  listaInventario: any[] = [];
  carritoHerramientas: any[] = []; 
  cantidadPrestamosActuales: number = 0; // Préstamos activos en BD

  // Configuración (Responsable del almacén)
  empleadoActual = 'EMP-01';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, 
      menu, alertCircle, checkmarkCircle, sendOutline, 
      qrCodeOutline, hammerOutline, trashOutline, addOutline, 
      constructOutline, addCircleOutline, listOutline, trashBinOutline,
      chevronDownOutline, chevronUpOutline
    });
  }

  async ngOnInit() {
    await this.cargarInventario();
    await this.cargarMaestros();
  }

  async cargarInventario() {
    try {
      this.listaInventario = await this.almacenService.obtenerInventario();
    } catch (error) { console.error("Error inventario:", error); }
  }

  async cargarMaestros() {
    try {
      this.listaMaestros = await this.almacenService.obtenerMaestros();
    } catch (error) { console.error("Error maestros:", error); }
  }

  /**
   * Verifica la existencia del Alumno o Profesor
   */
  async verificarReceptor() {
    const id = this.prestamo.identificador.trim();
    this.receptorEncontrado = null;

    if (id.length < 1) return;

    if (this.prestamo.tipoReceptor === 'alumno') {
      if (id.length >= 8) {
        const alumno = await this.almacenService.buscarAlumnoPorMatricula(id);
        if (alumno) {
          this.receptorEncontrado = alumno;
          this.prestamo.nombreReceptor = alumno.nombre;
          this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
        }
      }
    } else {
      // Búsqueda para Profesor
      const prof = this.listaMaestros.find(p => 
        String(p.num_maestro).trim() === String(id)
      );
      
      if (prof) {
        this.receptorEncontrado = prof;
        this.prestamo.nombreReceptor = prof.nombre;
        this.materiasFiltradas = prof.materias || [];
        this.prestamo.materia = ''; 
        this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
      }
    }
  }

  /**
   * Se ejecuta cuando un alumno selecciona al profesor que autoriza
   */
  onProfesorChange() {
    // profesorAutoriza ahora contiene el objeto completo del maestro
    if (this.prestamo.profesorAutoriza) {
      this.materiasFiltradas = this.prestamo.profesorAutoriza.materias || [];
      this.prestamo.materia = ''; 
    }
  }

  /**
   * Busca herramientas disponibles
   */
  async buscarHerramienta() {
    if (!this.codigoBusqueda) {
      this.herramientaEncontrada = null;
      return;
    }

    const encontrada = this.listaInventario.find(
      h => h.num_herramienta.toUpperCase() === this.codigoBusqueda.trim().toUpperCase()
    );
    
    if (encontrada) {
      this.herramientaEncontrada = encontrada;
      if (encontrada.prestada || encontrada.estado === 'Prestado') {
        this.mostrarMensaje('Esta herramienta ya está prestada.', 'warning');
      } else if (encontrada.estado === 'Mantenimiento') {
        this.mostrarMensaje('Herramienta en mantenimiento.', 'warning');
      }
    } else {
      this.herramientaEncontrada = null;
    }
  }

  /**
   * Añade la herramienta al carrito con validación de "Suelos"
   */
  agregarAlCarrito() {
    if (!this.herramientaEncontrada) return;

    const existe = this.carritoHerramientas.find(h => h.num_herramienta === this.herramientaEncontrada.num_herramienta);
    if (existe) {
      this.mostrarMensaje('Ya agregaste esta herramienta.', 'warning');
      return;
    }

    // Lógica de límites
    let tieneLimite = true;

    // Si es profesor y del área de SUELOS, no tiene límite
    if (this.prestamo.tipoReceptor === 'profesor' && this.receptorEncontrado?.departamento === 'SUELOS') {
      tieneLimite = false;
    }

    if (tieneLimite && (this.cantidadPrestamosActuales + this.carritoHerramientas.length) >= 5) {
      this.mostrarMensaje('Límite de 5 herramientas alcanzado.', 'danger');
      return;
    }

    this.carritoHerramientas.push(this.herramientaEncontrada);
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.mostrarMensaje('Agregada a la lista', 'success');
  }

  quitarDelCarrito(index: number) {
    this.carritoHerramientas.splice(index, 1);
  }

  /**
   * Registra los préstamos en Firebase incluyendo el Departamento
   */
  async finalizarPrestamo() {
    if (this.carritoHerramientas.length === 0 || !this.prestamo.materia || !this.prestamo.fechaEntrega) {
      this.mostrarMensaje('Completa los datos y la lista.', 'warning');
      return;
    }

    let exitos = 0;
    
    // Identificar quién es el docente responsable (el que autoriza o el que recibe directamente)
    const autorizador = this.prestamo.tipoReceptor === 'alumno' 
      ? this.prestamo.profesorAutoriza 
      : this.receptorEncontrado;

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
          departamento: autorizador?.departamento || 'N/A' // Guardamos el departamento en el registro
        },
        herramienta: h,
        materia: this.prestamo.materia,
        fechaEntrega: this.prestamo.fechaEntrega,
        empleadoAlmacen: this.empleadoActual
      };

      const resultado = await this.almacenService.registrarNuevoPrestamoDetallado(payload);
      
      if (resultado.exito) {
        exitos++;
        
        // Actualización instantánea local del inventario
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
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async escanearCodigo() {
    // Aquí puedes integrar el capacitor-barcode-scanner después
    this.mostrarMensaje('Escáner listo para conectar.', 'medium');
  }
}