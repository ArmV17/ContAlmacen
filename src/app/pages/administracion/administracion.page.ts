import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  menu, personAddOutline, buildOutline, idCardOutline, 
  saveOutline, trashOutline, createOutline, addCircleOutline, closeCircle 
} from 'ionicons/icons';

import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.page.html',
  styleUrls: ['./administracion.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AdministracionPage {

  segmentoActual: string = 'alumnos';
  textoBuscar: string = ''; // Control del buscador universal

  // Estados de modo edición
  editandoAlumno: boolean = false;
  editandoMaestro: boolean = false;
  editandoHerramienta: boolean = false;
  editandoEmpleado: boolean = false;
  
  // Listas de datos cargadas desde Firebase
  alumnos: any[] = [];
  herramientas: any[] = [];
  empleados: any[] = [];
  maestros: any[] = [];
  tiposExistentes: string[] = [];

  // Modelos para formularios
  alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
  empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
  
  // Modelos para Herramientas
  herramientaNueva = { codigo: '', nombre: '', tipo: '' };
  selectorTipo: string = ''; 
  tipoNuevoTemp: string = ''; 

  // Modelos para Maestros
  maestroNuevo = { numMaestro: '', nombre: '', materias: [] as string[] };
  materiaTemp: string = ''; 

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ 
      menu, personAddOutline, buildOutline, idCardOutline, 
      saveOutline, trashOutline, createOutline, addCircleOutline, closeCircle 
    });
  }

  async ionViewWillEnter() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.alumnos = await this.almacenService.obtenerAlumnos();
    this.herramientas = await this.almacenService.obtenerInventario();
    this.tiposExistentes = await this.almacenService.obtenerTiposDeHerramientas();
    this.empleados = await this.almacenService.obtenerEmpleados();
    this.maestros = await this.almacenService.obtenerMaestros();
  }

  // --- LÓGICA DE BÚSQUEDA FILTRADA UNIVERSAL ---
  get listaFiltrada() {
    const t = this.textoBuscar.toLowerCase().trim();
    
    if (this.segmentoActual === 'alumnos') {
      return this.alumnos.filter(a => 
        a.nombre.toLowerCase().includes(t) || a.matricula.includes(t)
      );
    }
    if (this.segmentoActual === 'maestros') {
      return this.maestros.filter(m => 
        m.nombre.toLowerCase().includes(t) || m.num_maestro.includes(t)
      );
    }
    if (this.segmentoActual === 'herramientas') {
      return this.herramientas.filter(h => 
        h.nombre_herramienta.toLowerCase().includes(t) || h.num_herramienta.includes(t)
      );
    }
    if (this.segmentoActual === 'empleados') {
      return this.empleados.filter(e => 
        e.nombre.toLowerCase().includes(t) || e.num_empleado.includes(t)
      );
    }
    return [];
  }

  // --- GESTIÓN DE ALUMNOS ---
  prepararEdicionAlumno(alumno: any) {
    this.alumnoNuevo = { ...alumno };
    this.editandoAlumno = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionAlumno() {
    this.alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
    this.editandoAlumno = false;
  }

  async guardarAlumno() {
    const res = await this.almacenService.registrarAlumno(this.alumnoNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoAlumno ? 'Alumno actualizado' : 'Alumno registrado', 'success');
      this.cancelarEdicionAlumno();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al procesar la solicitud', 'danger');
  }

  // --- GESTIÓN DE HERRAMIENTAS ---
  prepararEdicionHerramienta(h: any) {
    this.herramientaNueva = { 
      codigo: h.num_herramienta, 
      nombre: h.nombre_herramienta, 
      tipo: h.tipo_herramienta 
    };
    this.selectorTipo = h.tipo_herramienta;
    this.editandoHerramienta = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionHerramienta() {
    this.herramientaNueva = { codigo: '', nombre: '', tipo: '' };
    this.selectorTipo = '';
    this.tipoNuevoTemp = '';
    this.editandoHerramienta = false;
  }

  async guardarHerramienta() {
    if (this.selectorTipo === 'nuevo') {
      this.herramientaNueva.tipo = this.tipoNuevoTemp;
    } else {
      this.herramientaNueva.tipo = this.selectorTipo;
    }

    if (!this.herramientaNueva.tipo) {
      this.mostrarMensaje('Selecciona un tipo', 'warning');
      return;
    }

    const res = await this.almacenService.registrarHerramienta(this.herramientaNueva);
    if (res.exito) {
      this.mostrarMensaje(this.editandoHerramienta ? 'Herramienta actualizada' : 'Herramienta registrada', 'success');
      this.cancelarEdicionHerramienta();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar', 'danger');
  }

  // --- GESTIÓN DE EMPLEADOS ---
  prepararEdicionEmpleado(e: any) {
    this.empleadoNuevo = { 
      numEmpleado: e.num_empleado, 
      nombre: e.nombre, 
      password: '', 
      rol: e.rol 
    };
    this.editandoEmpleado = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionEmpleado() {
    this.empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
    this.editandoEmpleado = false;
  }

  async guardarEmpleado() {
    const res = await this.almacenService.registrarEmpleado(this.empleadoNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoEmpleado ? 'Empleado actualizado' : 'Empleado registrado', 'success');
      this.cancelarEdicionEmpleado();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar', 'danger');
  }

  // --- GESTIÓN DE MAESTROS ---
  prepararEdicionMaestro(m: any) {
    this.maestroNuevo = { 
      numMaestro: m.num_maestro, 
      nombre: m.nombre, 
      materias: [...m.materias] 
    };
    this.editandoMaestro = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionMaestro() {
    this.maestroNuevo = { numMaestro: '', nombre: '', materias: [] };
    this.materiaTemp = '';
    this.editandoMaestro = false;
  }

  agregarMateriaLista() {
    if (this.materiaTemp.trim().length > 0) {
      this.maestroNuevo.materias.push(this.materiaTemp.trim());
      this.materiaTemp = ''; 
    }
  }

  quitarMateria(index: number) {
    this.maestroNuevo.materias.splice(index, 1);
  }

  async guardarMaestro() {
    if (this.maestroNuevo.materias.length === 0 && this.materiaTemp.trim() !== '') {
      this.agregarMateriaLista();
    }
    
    const res = await this.almacenService.registrarMaestro(this.maestroNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoMaestro ? 'Maestro actualizado' : 'Maestro registrado', 'success');
      this.cancelarEdicionMaestro();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar maestro', 'danger');
  }

  // --- ELIMINACIÓN ---
  async confirmarEliminar(tabla: string, idVal: string, nombre: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar a <strong>${nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar', 
          cssClass: 'boton-alerta-eliminar',
          handler: async () => {
            const res = await this.almacenService.eliminarRegistro(tabla, idVal);
            if (res.exito) {
              this.mostrarMensaje('Registro eliminado', 'success');
              this.cargarDatos();
            } else this.mostrarMensaje('Error: registro vinculado a un préstamo', 'danger');
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(m: string, c: string) {
    const t = await this.toastController.create({ message: m, duration: 2000, color: c, position: 'bottom' });
    t.present();
  }
}