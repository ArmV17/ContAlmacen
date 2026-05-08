import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  saveOutline, personOutline, buildOutline, barcodeOutline, 
  menu, alertCircle, checkmarkCircle, sendOutline, 
  qrCodeOutline, hammerOutline, trashOutline, addOutline, 
  constructOutline, addCircleOutline, listOutline, trashBinOutline
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
  prestamo = {
    tipoReceptor: 'alumno',   // 'alumno' o 'profesor'
    identificador: '',        // Matrícula o N° Empleado
    nombreReceptor: '',
    profesorAutoriza: '',     // Solo para alumnos
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

  // Configuración temporal (Responsable del almacén)
  empleadoActual = 'EMP-01';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, 
      menu, alertCircle, checkmarkCircle, sendOutline, 
      qrCodeOutline, hammerOutline, trashOutline, addOutline, 
      constructOutline, addCircleOutline, listOutline, trashBinOutline
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
   * Verifica la existencia del Alumno o Profesor según el Segment seleccionado
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
      // --- CAMBIO AQUÍ: Usamos num_maestro ---
      const prof = this.listaMaestros.find(p => 
        String(p.num_maestro).trim() === String(id)
      );
      
      if (prof) {
        this.receptorEncontrado = prof;
        this.prestamo.nombreReceptor = prof.nombre;
        this.materiasFiltradas = prof.materias || [];
        this.prestamo.materia = ''; 
      } else {
        // Opcional: un log para ver qué hay en la lista si no lo encuentra
        console.log("No encontrado. Lista disponible:", this.listaMaestros);
      }
    }
  }

  /**
   * Busca herramientas disponibles en el inventario local
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
   * Añade la herramienta al carrito (Valida límite solo para alumnos)
   */
  agregarAlCarrito() {
    if (!this.herramientaEncontrada) return;

    const existe = this.carritoHerramientas.find(h => h.num_herramienta === this.herramientaEncontrada.num_herramienta);
    if (existe) {
      this.mostrarMensaje('Ya agregaste esta herramienta.', 'warning');
      return;
    }

    // Validar límite de 5 SOLO SI ES ALUMNO
    if (this.prestamo.tipoReceptor === 'alumno') {
      if ((this.cantidadPrestamosActuales + this.carritoHerramientas.length) >= 5) {
        this.mostrarMensaje('Límite de 5 herramientas alcanzado para alumnos.', 'danger');
        return;
      }
    }

    this.carritoHerramientas.push(this.herramientaEncontrada);
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.mostrarMensaje('Agregada a la lista', 'success');
  }

  quitarDelCarrito(index: number) {
    this.carritoHerramientas.splice(index, 1);
  }

  onProfesorChange() {
    const prof = this.listaMaestros.find(p => p.nombre === this.prestamo.profesorAutoriza);
    this.materiasFiltradas = prof ? prof.materias : [];
    this.prestamo.materia = ''; 
  }

  /**
   * Registra los préstamos en Firebase
   */
  async finalizarPrestamo() {
    if (this.carritoHerramientas.length === 0 || !this.prestamo.fechaEntrega) {
      this.mostrarMensaje('Completa los datos y la lista.', 'warning');
      return;
    }

    let exitos = 0;
    
    const autorizador = this.prestamo.tipoReceptor === 'alumno' 
      ? this.listaMaestros.find(p => p.nombre === this.prestamo.profesorAutoriza)
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
          num_empleado: autorizador?.num_maestro || 'S/N', // Usando tu campo corregido
          nombre: autorizador?.nombre || 'Auto-autorizado'
        },
        herramienta: h,
        materia: this.prestamo.materia,
        fechaEntrega: this.prestamo.fechaEntrega,
        empleadoAlmacen: this.empleadoActual
      };

      const resultado = await this.almacenService.registrarNuevoPrestamoDetallado(payload);
      
      if (resultado.exito) {
        exitos++;
        
        // --- ESTO ES LO NUEVO: ACTUALIZACIÓN INSTANTÁNEA ---
        // Buscamos la herramienta en nuestra lista local y la marcamos como prestada
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
      // Si algo falló, recargamos por seguridad
      await this.cargarInventario();
    }
  }

  limpiarFormulario() {
    this.prestamo = { 
      tipoReceptor: this.prestamo.tipoReceptor, // Mantenemos el tipo seleccionado
      identificador: '', 
      nombreReceptor: '', 
      profesorAutoriza: '', 
      materia: '', 
      fechaEntrega: '' 
    };
    this.receptorEncontrado = null; // CRÍTICO: Borra al usuario anterior
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
    this.mostrarMensaje('Escáner próximamente', 'medium');
  }
}