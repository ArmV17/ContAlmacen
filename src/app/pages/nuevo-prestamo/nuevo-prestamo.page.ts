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

  // Referencia al input de herramientas para controlar el foco con el escáner
  @ViewChild('inputHerramienta') inputHerramienta!: IonInput;

  // Estructura del préstamo
  prestamo: any = {
    tipoReceptor: 'alumno',   // 'alumno' o 'profesor'
    identificador: '',        // Matrícula o N° Empleado
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

  // El nombre se recupera dinámicamente del login
  empleadoActual = localStorage.getItem('userName') || 'Admin';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, 
      menu, alertCircle, checkmarkCircle, sendOutline, 
      qrCodeOutline, hammerOutline, trashOutline, addOutline, 
      constructOutline, addCircleOutline, listOutline, trashBinOutline,
      chevronDownOutline, chevronUpOutline, refreshOutline
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
   * Verifica al receptor. Si se encuentra, el foco salta automáticamente al input de herramientas
   * para empezar a usar el escáner Alacrity.
   */
  async verificarReceptor() {
    const id = this.prestamo.identificador.trim();
    this.receptorEncontrado = null;

    if (id.length < 1) return;

    if (this.prestamo.tipoReceptor === 'alumno') {
      // REGLA: Solo procesa si parece una matrícula (ej. 8 dígitos)
      // Esto evita que si escaneas una herramienta aquí por error, el sistema intente buscarla
      if (id.length >= 8 && /^\d+$/.test(id)) { 
        const alumno = await this.almacenService.buscarAlumnoPorMatricula(id);
        if (alumno) {
          this.receptorEncontrado = alumno;
          this.prestamo.nombreReceptor = alumno.nombre;
          this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
          this.setFocoHerramienta();
        }
      }
    } else {
      // REGLA: Para profesores, buscamos coincidencias exactas en tu lista cargada
      // Normalmente son IDs más cortos (ej. 4 dígitos)
      const prof = this.listaMaestros.find(p => 
        String(p.num_maestro).trim() === String(id)
      );
      
      if (prof) {
        this.receptorEncontrado = prof;
        this.prestamo.nombreReceptor = prof.nombre;
        this.materiasFiltradas = prof.materias || [];
        this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(id);
        this.setFocoHerramienta();
      }
    }
  }

  setFocoHerramienta() {
    setTimeout(() => {
      this.inputHerramienta?.setFocus();
    }, 400);
  }

  /**
   * Procesa la lectura del escáner Alacrity (Evento Enter automático)
   */
  /**
 * Procesa la lectura del escáner.
 */
  async buscarHerramientaEscaneada() {
    // SEGURIDAD: Si por alguna razón el cursor llega aquí sin receptor, no hace nada
    if (!this.receptorEncontrado) {
      this.mostrarMensaje('Primero debe identificar al alumno o profesor', 'warning');
      this.codigoBusqueda = '';
      return;
    }

    if (!this.codigoBusqueda) return;

    await this.buscarHerramienta();

    if (this.herramientaEncontrada) {
      if (!this.herramientaEncontrada.prestada && this.herramientaEncontrada.estado !== 'Mantenimiento') {
        this.agregarAlCarrito(); // Se añade automáticamente con el "Enter" del Alacrity
      }
    } else {
      this.mostrarMensaje('Código no encontrado', 'warning');
      this.codigoBusqueda = '';
      this.inputHerramienta.setFocus();
    }
  }

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

  agregarAlCarrito() {
    if (!this.herramientaEncontrada) return;

    const existe = this.carritoHerramientas.find(h => h.num_herramienta === this.herramientaEncontrada.num_herramienta);
    if (existe) {
      this.mostrarMensaje('Ya agregaste esta herramienta.', 'warning');
      this.codigoBusqueda = '';
      this.inputHerramienta.setFocus();
      return;
    }

    let tieneLimite = true;
    if (this.prestamo.tipoReceptor === 'profesor' && this.receptorEncontrado?.departamento === 'CIENCIAS DEL SUELO') {
      tieneLimite = false;
    }

    if (tieneLimite && (this.cantidadPrestamosActuales + this.carritoHerramientas.length) >= 5) {
      this.mostrarMensaje('Límite de 5 herramientas alcanzado.', 'danger');
      return;
    }

    this.carritoHerramientas.push(this.herramientaEncontrada);
    this.mostrarMensaje(`${this.herramientaEncontrada.nombre_herramienta} en lista`, 'success');
    
    // Limpieza y preparación para el siguiente escaneo automático
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    setTimeout(() => this.inputHerramienta?.setFocus(), 100);
  }

  onProfesorChange() {
    if (this.prestamo.profesorAutoriza) {
      this.materiasFiltradas = this.prestamo.profesorAutoriza.materias || [];
      this.prestamo.materia = ''; 
    }
  }

  quitarDelCarrito(index: number) {
    this.carritoHerramientas.splice(index, 1);
  }

  async finalizarPrestamo() {
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
}