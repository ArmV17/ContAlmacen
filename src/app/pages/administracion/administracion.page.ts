import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  menu, personAddOutline, buildOutline, idCardOutline, 
  saveOutline, trashOutline, createOutline 
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
  
  // Listas de datos
  alumnos: any[] = [];
  herramientas: any[] = [];
  empleados: any[] = [];

  // Modelos para formularios
  alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
  herramientaNueva = { codigo: '', nombre: '' };
  empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ menu, personAddOutline, buildOutline, idCardOutline, saveOutline, trashOutline, createOutline });
  }

  async ionViewWillEnter() {
    this.cargarDatos();
  }

  async cargarDatos() {
    // 1. Cargar Alumnos y descifrar nombres
    const { data: dataAlu } = await (this.almacenService as any).supabase.from('alumnos').select('*');
    this.alumnos = dataAlu.map((a: any) => {
      try { a.nombre = this.almacenService.desencriptarTexto(a.nombre); } catch(e) {}
      return a;
    });

    // 2. Cargar Herramientas (Inventario)
    this.herramientas = await this.almacenService.obtenerInventario();

    // 3. Cargar Empleados (Trabajadores)
    const { data: dataEmp } = await (this.almacenService as any).supabase.from('trabajadores').select('*');
    this.empleados = dataEmp.map((e: any) => {
      try { e.nombre = this.almacenService.desencriptarTexto(e.nombre); } catch(e) {}
      return e;
    });
  }

  // --- MÉTODOS DE GUARDADO ---
  async guardarAlumno() {
    const res = await this.almacenService.registrarAlumno(this.alumnoNuevo);
    if (res.exito) {
      this.mostrarMensaje('Alumno registrado', 'success');
      this.alumnoNuevo = { matricula: '', nombre: '', carrera: '', grado: '' };
      this.cargarDatos();
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
  }

  async guardarHerramienta() {
    const res = await this.almacenService.registrarHerramienta(this.herramientaNueva);
    if (res.exito) {
      this.mostrarMensaje('Herramienta registrada', 'success');
      this.herramientaNueva = { codigo: '', nombre: '' };
      this.cargarDatos();
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
  }

  async guardarEmpleado() {
    const res = await this.almacenService.registrarEmpleado(this.empleadoNuevo);
    if (res.exito) {
      this.mostrarMensaje('Empleado registrado', 'success');
      this.empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
      this.cargarDatos();
    } else this.mostrarMensaje('Error: ' + res.mensaje, 'danger');
  }

  // --- MÉTODOS DE ELIMINACIÓN ---
  async confirmarEliminar(tabla: string, idCol: string, idVal: string, nombre: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar a <strong>${nombre}</strong>?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar', 
          cssClass: 'boton-alerta-eliminar',
          handler: async () => {
            const res = await this.almacenService.eliminarRegistro(tabla, idCol, idVal);
            if (res.exito) {
              this.mostrarMensaje('Eliminado correctamente', 'success');
              this.cargarDatos();
            } else this.mostrarMensaje('Error: El registro tiene historial vinculado', 'danger');
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