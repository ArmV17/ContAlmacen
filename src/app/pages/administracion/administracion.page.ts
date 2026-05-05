import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { menu, personAddOutline, buildOutline, idCardOutline, saveOutline } from 'ionicons/icons';

import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.page.html',
  styleUrls: ['./administracion.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class AdministracionPage {

  // Controla qué pestaña se está viendo (alumnos, herramientas o empleados)
  segmentoActual: string = 'alumnos';

  // Modelos para los formularios
  alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
  herramientaNueva = { codigo: '', nombre: '' };
  empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController
  ) {
    addIcons({ menu, personAddOutline, buildOutline, idCardOutline, saveOutline });
  }

  async guardarAlumno() {
    if (!this.alumnoNuevo.matricula || !this.alumnoNuevo.nombre) return this.mostrarMensaje('Faltan datos clave del alumno', 'warning');
    
    const res = await this.almacenService.registrarAlumno(this.alumnoNuevo);
    if (res.exito) {
      this.mostrarMensaje('Alumno registrado con éxito', 'success');
      this.alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
  }

  async guardarHerramienta() {
    if (!this.herramientaNueva.codigo || !this.herramientaNueva.nombre) return this.mostrarMensaje('Faltan datos de la herramienta', 'warning');
    
    const res = await this.almacenService.registrarHerramienta(this.herramientaNueva);
    if (res.exito) {
      this.mostrarMensaje('Herramienta registrada con éxito', 'success');
      this.herramientaNueva = { codigo: '', nombre: '' };
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
  }

  async guardarEmpleado() {
    if (!this.empleadoNuevo.numEmpleado || !this.empleadoNuevo.nombre || !this.empleadoNuevo.password) return this.mostrarMensaje('Faltan datos del empleado', 'warning');
    
    const res = await this.almacenService.registrarEmpleado(this.empleadoNuevo);
    if (res.exito) {
      this.mostrarMensaje('Empleado registrado con éxito', 'success');
      this.empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
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
}