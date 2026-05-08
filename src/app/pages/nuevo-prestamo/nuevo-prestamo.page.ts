import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  saveOutline, 
  personOutline, 
  buildOutline, 
  barcodeOutline, 
  menu, 
  alertCircle, 
  checkmarkCircle, 
  sendOutline, 
  qrCodeOutline,
  hammerOutline 
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

  // Objeto principal del préstamo
  prestamo = {
    matricula: '',
    usuario: '',     // Se llenará automáticamente con el nombre del alumno
    herramientaId: '',
    profesor: '',
    materia: ''
  };

  // Variables de estado
  alumnoEncontrado: any = null;
  listaMaestros: any[] = [];
  materiasFiltradas: string[] = [];
  
  codigoBusqueda: string = '';
  herramientaEncontrada: any = null;
  listaInventario: any[] = [];
  
  empleadoActual = 'EMP-01';

  cantidadPrestamos: number = 0;

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, 
      menu, alertCircle, checkmarkCircle, sendOutline, qrCodeOutline, hammerOutline
    });
  }

  async ngOnInit() {
    await this.cargarInventario();
    await this.cargarMaestros();
  }

  async cargarInventario() {
    try {
      this.listaInventario = await this.almacenService.obtenerInventario();
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    }
  }

  async cargarMaestros() {
    try {
      // Este método debe existir en tu servicio y traer nombre y materias
      this.listaMaestros = await this.almacenService.obtenerMaestros();
    } catch (error) {
      console.error("Error al cargar maestros:", error);
    }
  }

  onProfesorChange() {
    // Buscamos al maestro seleccionado en la lista que vino de la BD
    const prof = this.listaMaestros.find(p => p.nombre === this.prestamo.profesor);
    this.materiasFiltradas = prof ? prof.materias : [];
    this.prestamo.materia = ''; 
  }

  async verificarAlumno() {
    if (this.prestamo.matricula.length >= 8) {
      const alumno = await this.almacenService.buscarAlumnoPorMatricula(this.prestamo.matricula);
      
      if (alumno) {
        this.alumnoEncontrado = alumno;
        this.prestamo.usuario = alumno.nombre;
        
        // VALIDACIÓN: Contar cuántas herramientas tiene ya
        this.cantidadPrestamos = await this.almacenService.contarPrestamosActivos(this.prestamo.matricula);
        
        if (this.cantidadPrestamos >= 5) {
          this.mostrarMensaje('El alumno ya tiene 5 herramientas. No puede pedir más.', 'danger');
        }
      } else {
        this.alumnoEncontrado = null;
        this.cantidadPrestamos = 0;
      }
    } else {
      this.alumnoEncontrado = null;
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
      this.prestamo.herramientaId = encontrada.num_herramienta;
      
      // VALIDACIÓN: ¿Está ya prestada? (Checamos el campo 'prestada' o el 'estado')
      if (encontrada.prestada === true || encontrada.estado === 'Prestado') {
        this.mostrarMensaje('Esta herramienta ya se encuentra prestada.', 'warning');
      } else if (encontrada.estado === 'Mantenimiento') {
        this.mostrarMensaje('Herramienta en mantenimiento.', 'warning');
      }
    } else {
      this.herramientaEncontrada = null;
      this.prestamo.herramientaId = '';
    }
  }

  async finalizarPrestamo() {
    if (!this.alumnoEncontrado) {
      this.mostrarMensaje('Debe verificar un alumno válido.', 'warning');
      return;
    }

    if (this.herramientaEncontrada?.estado === 'Mantenimiento') {
      this.mostrarMensaje('No se puede prestar una herramienta dañada.', 'danger');
      return;
    }

    const resultado = await this.almacenService.registrarNuevoPrestamo(
      this.prestamo.matricula,
      this.herramientaEncontrada.num_herramienta,
      this.empleadoActual,
      this.prestamo.profesor,
      this.prestamo.materia
    );

    if (resultado.exito) {
      this.mostrarMensaje('Préstamo registrado correctamente.', 'success');
      this.limpiarFormulario();
    } else {
      this.mostrarMensaje('Error al registrar.', 'danger');
    }
  }

  limpiarFormulario() {
    this.prestamo = { matricula: '', usuario: '', herramientaId: '', profesor: '', materia: '' };
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.alumnoEncontrado = null;
    this.materiasFiltradas = [];
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }

  async escanearCodigo() {
    console.log('Iniciando escaneo...');
    const toast = await this.toastController.create({
      message: 'Funcionalidad de cámara próximamente',
      duration: 2000,
      color: 'medium'
    });
    toast.present();
  }
}