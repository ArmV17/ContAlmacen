import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  menu, personAddOutline, buildOutline, idCardOutline, 
  saveOutline, trashOutline, createOutline, addCircleOutline, 
  closeCircle, qrCodeOutline, informationCircleOutline, helpCircleOutline,
  lockClosedOutline, peopleCircleOutline
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
  textoBuscar: string = '';

  // Estados de modo edición
  editandoAlumno: boolean = false;
  editandoMaestro: boolean = false;
  editandoHerramienta: boolean = false;
  editandoEmpleado: boolean = false;
  
  // Listas de datos
  alumnos: any[] = [];
  herramientas: any[] = [];
  empleados: any[] = [];
  maestros: any[] = [];
  tiposExistentes: string[] = [];

  // --- NUEVAS PROPIEDADES PARA SUGERENCIAS ---
  nombresUnicos: string[] = [];
  tiposFiltrados: string[] = [];

  // Modelos para formularios
  alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
  empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
  
  // Modelos para Herramientas (Asegúrate de usar 'tipo' y no 'selectorTipo' para el datalist)
  herramientaNueva = { codigo: '', nombre: '', tipo: '' };

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
      saveOutline, trashOutline, createOutline, addCircleOutline, 
      closeCircle, qrCodeOutline, informationCircleOutline, helpCircleOutline,
      lockClosedOutline, peopleCircleOutline
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

    // Lógica para obtener nombres únicos para el datalist
    this.nombresUnicos = [...new Set(this.herramientas.map(h => h.nombre_herramienta))];
  }

  // --- LÓGICA DE SUGERENCIAS DINÁMICAS ---
  actualizarSugerenciasTipo() {
    const nombreEscrito = this.herramientaNueva.nombre?.trim().toLowerCase() || '';
    
    if (nombreEscrito === '') {
      this.tiposFiltrados = [];
      return;
    }

    const coincidencias = this.herramientas.filter(h => 
      h.nombre_herramienta?.trim().toLowerCase() === nombreEscrito
    );

    this.tiposFiltrados = [...new Set(coincidencias
      .map(h => h.tipo_herramienta?.trim())
      .filter(t => t && t !== '')
    )];

    console.log('Sugerencias para:', nombreEscrito, this.tiposFiltrados);
  }

  // --- LÓGICA DE BÚSQUEDA FILTRADA UNIVERSAL ---
  get listaFiltrada() {
    const t = this.textoBuscar.toLowerCase().trim();
    if (this.segmentoActual === 'alumnos') return this.alumnos.filter(a => a.nombre.toLowerCase().includes(t) || a.matricula.includes(t));
    if (this.segmentoActual === 'maestros') return this.maestros.filter(m => m.nombre.toLowerCase().includes(t) || m.num_maestro.includes(t));
    if (this.segmentoActual === 'herramientas') return this.herramientas.filter(h => h.nombre_herramienta.toLowerCase().includes(t) || h.num_herramienta.includes(t));
    if (this.segmentoActual === 'empleados') return this.empleados.filter(e => e.nombre.toLowerCase().includes(t) || e.num_empleado.includes(t));
    return [];
  }

  // --- GESTIÓN DE HERRAMIENTAS & QR ---
  async descargarQRDirecto(herramienta: any) {
    const codigo = herramienta.num_herramienta;
    const nombre = herramienta.nombre_herramienta;
    const tipo = herramienta.tipo_herramienta;
    const textoEtiqueta = tipo ? `${nombre} (${tipo})` : nombre;
    
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(codigo)}&size=300&caption=${encodeURIComponent(textoEtiqueta)}`;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${nombre.replace(/[^a-z0-9]/gi, '_')}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      this.mostrarMensaje('QR descargado', 'success');
    } catch (e) {
      window.open(qrUrl, '_blank');
    }
  }

  async guardarHerramienta() {
    const res = await this.almacenService.registrarHerramienta(this.herramientaNueva);
    if (res.exito) {
      this.mostrarMensaje(this.editandoHerramienta ? 'Herramienta actualizada' : 'Herramienta registrada', 'success');
      this.cancelarEdicionHerramienta();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar', 'danger');
  }

  prepararEdicionHerramienta(h: any) {
    this.herramientaNueva = { 
      codigo: h.num_herramienta, 
      nombre: h.nombre_herramienta, 
      tipo: h.tipo_herramienta 
    };
    this.editandoHerramienta = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionHerramienta() {
    this.herramientaNueva = { codigo: '', nombre: '', tipo: '' };
    this.editandoHerramienta = false;
  }

  // --- GESTIÓN DE ALUMNOS ---
  async guardarAlumno() {
    const res = await this.almacenService.registrarAlumno(this.alumnoNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoAlumno ? 'Alumno actualizado' : 'Alumno registrado', 'success');
      this.cancelarEdicionAlumno();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al procesar la solicitud', 'danger');
  }

  prepararEdicionAlumno(alumno: any) {
    this.alumnoNuevo = { ...alumno };
    this.editandoAlumno = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionAlumno() {
    this.alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
    this.editandoAlumno = false;
  }

  // --- GESTIÓN DE MAESTROS ---
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
    if (this.maestroNuevo.materias.length === 0 && this.materiaTemp.trim() !== '') this.agregarMateriaLista();
    const res = await this.almacenService.registrarMaestro(this.maestroNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoMaestro ? 'Maestro actualizado' : 'Maestro registrado', 'success');
      this.cancelarEdicionMaestro();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar maestro', 'danger');
  }

  prepararEdicionMaestro(m: any) {
    this.maestroNuevo = { numMaestro: m.num_maestro, nombre: m.nombre, materias: [...m.materias] };
    this.editandoMaestro = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionMaestro() {
    this.maestroNuevo = { numMaestro: '', nombre: '', materias: [] };
    this.materiaTemp = '';
    this.editandoMaestro = false;
  }

  // --- GESTIÓN DE EMPLEADOS ---
  async guardarEmpleado() {
    const res = await this.almacenService.registrarEmpleado(this.empleadoNuevo);
    if (res.exito) {
      this.mostrarMensaje(this.editandoEmpleado ? 'Empleado actualizado' : 'Empleado registrado', 'success');
      this.cancelarEdicionEmpleado();
      this.cargarDatos();
    } else this.mostrarMensaje('Error al guardar', 'danger');
  }

  prepararEdicionEmpleado(e: any) {
    this.empleadoNuevo = { numEmpleado: e.num_empleado, nombre: e.nombre, password: '', rol: e.rol };
    this.editandoEmpleado = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionEmpleado() {
    this.empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
    this.editandoEmpleado = false;
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