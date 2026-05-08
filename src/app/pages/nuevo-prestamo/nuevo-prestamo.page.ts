import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  saveOutline, personOutline, buildOutline, barcodeOutline, 
  menu, alertCircle, checkmarkCircle, sendOutline, 
  qrCodeOutline, hammerOutline, trashOutline, addOutline,
  constructOutline
} from 'ionicons/icons';

import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-nuevo-prestamo',
  templateUrl: './nuevo-prestamo.page.html',
  styleUrls: ['./nuevo-prestamo.page.scss'],
  standalone: true, 
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NuevoPrestamoPage implements OnInit {

  prestamo = {
    matricula: '',
    usuario: '',
    profesor: '',
    materia: ''
  };

  // --- NUEVAS VARIABLES PARA EL CARRITO ---
  carritoHerramientas: any[] = []; 
  cantidadPrestamosActuales: number = 0; // Préstamos que ya tiene en la BD

  alumnoEncontrado: any = null;
  listaMaestros: any[] = [];
  materiasFiltradas: string[] = [];
  
  codigoBusqueda: string = '';
  herramientaEncontrada: any = null;
  listaInventario: any[] = [];
  
  empleadoActual = 'EMP-01';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ 
      saveOutline, personOutline, buildOutline, barcodeOutline, 
      menu, alertCircle, checkmarkCircle, sendOutline, 
      qrCodeOutline, hammerOutline, trashOutline, addOutline, constructOutline
    });
  }

  async ngOnInit() {
    await this.cargarInventario();
    await this.cargarMaestros();
  }

  async cargarInventario() {
    try {
      this.listaInventario = await this.almacenService.obtenerInventario();
    } catch (error) { console.error(error); }
  }

  async cargarMaestros() {
    try {
      this.listaMaestros = await this.almacenService.obtenerMaestros();
    } catch (error) { console.error(error); }
  }

  async verificarAlumno() {
    if (this.prestamo.matricula.length >= 8) {
      const alumno = await this.almacenService.buscarAlumnoPorMatricula(this.prestamo.matricula);
      if (alumno) {
        this.alumnoEncontrado = alumno;
        this.prestamo.usuario = alumno.nombre;
        // Consultamos cuántas herramientas debe actualmente
        this.cantidadPrestamosActuales = await this.almacenService.contarPrestamosActivos(this.prestamo.matricula);
      } else {
        this.alumnoEncontrado = null;
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
      
      if (encontrada.prestada || encontrada.estado === 'Prestado') {
        this.mostrarMensaje('Esta herramienta ya está prestada.', 'warning');
      } else if (encontrada.estado === 'Mantenimiento') {
        this.mostrarMensaje('Herramienta en mantenimiento.', 'warning');
      }
    } else {
      this.herramientaEncontrada = null;
    }
  }

  // --- LÓGICA DEL CARRITO ---
  agregarAlCarrito() {
    if (!this.herramientaEncontrada) return;

    // 1. Validar que no esté ya en el carrito
    const existe = this.carritoHerramientas.find(h => h.num_herramienta === this.herramientaEncontrada.num_herramienta);
    if (existe) {
      this.mostrarMensaje('Ya agregaste esta herramienta a la lista.', 'warning');
      return;
    }

    // 2. Validar límite (Existentes en BD + En carrito)
    if ((this.cantidadPrestamosActuales + this.carritoHerramientas.length) >= 5) {
      this.mostrarMensaje('Límite de 5 herramientas alcanzado para este alumno.', 'danger');
      return;
    }

    // 3. Agregar
    this.carritoHerramientas.push(this.herramientaEncontrada);
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.mostrarMensaje('Agregada a la lista', 'success');
  }

  quitarDelCarrito(index: number) {
    this.carritoHerramientas.splice(index, 1);
  }

  async finalizarPrestamo() {
    if (this.carritoHerramientas.length === 0) {
      this.mostrarMensaje('No hay herramientas en la lista.', 'warning');
      return;
    }

    let exitos = 0;

    // Procesamos todas las herramientas de la lista
    for (const h of this.carritoHerramientas) {
      const resultado = await this.almacenService.registrarNuevoPrestamo(
        this.prestamo.matricula,
        h.num_herramienta,
        this.empleadoActual,
        this.prestamo.profesor,
        this.prestamo.materia
      );
      if (resultado.exito) exitos++;
    }

    if (exitos === this.carritoHerramientas.length) {
      this.mostrarMensaje(`¡Se registraron ${exitos} préstamos con éxito!`, 'success');
      this.limpiarFormulario();
    } else {
      this.mostrarMensaje('Hubo errores en algunos registros.', 'danger');
      // Recargamos el inventario para reflejar lo que sí se prestó
      await this.cargarInventario();
    }
  }

  onProfesorChange() {
    const prof = this.listaMaestros.find(p => p.nombre === this.prestamo.profesor);
    this.materiasFiltradas = prof ? prof.materias : [];
    this.prestamo.materia = ''; 
  }

  limpiarFormulario() {
    this.prestamo = { matricula: '', usuario: '', profesor: '', materia: '' };
    this.codigoBusqueda = '';
    this.herramientaEncontrada = null;
    this.alumnoEncontrado = null;
    this.carritoHerramientas = [];
    this.materiasFiltradas = [];
    this.cantidadPrestamosActuales = 0;
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
    this.mostrarMensaje('Cámara próximamente', 'medium');
  }
}