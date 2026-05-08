import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  checkmarkCircleOutline, 
  alertCircleOutline, 
  buildOutline, 
  menu, 
  schoolOutline, 
  bookOutline, 
  calendarOutline, 
  personCircleOutline,
  logInOutline 
} from 'ionicons/icons';

// Importamos el servicio
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-devoluciones',
  templateUrl: './devoluciones.page.html',
  styleUrls: ['./devoluciones.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DevolucionesPage {

  prestamosPendientes: any[] = [];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    // Registramos todos los iconos nuevos que usamos en el HTML moderno
    addIcons({ 
      checkmarkCircleOutline, 
      alertCircleOutline, 
      buildOutline, 
      menu, 
      schoolOutline, 
      bookOutline, 
      calendarOutline, 
      personCircleOutline,
      logInOutline
    });
  }

  // Se ejecuta cada vez que el usuario entra a la pestaña
  async ionViewWillEnter() {
    await this.cargarPendientes();
  }

  async cargarPendientes() {
    // obtenerPrestamosDashboard ya trae los datos de alumnos e inventario unidos
    this.prestamosPendientes = await this.almacenService.obtenerPrestamosDashboard();
    console.log('Pendientes cargados:', this.prestamosPendientes);
  }

  async confirmarDevolucion(prestamo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Devolución',
      message: `¿El alumno <strong>${prestamo.alumnos?.nombre || 'Desconocido'}</strong> entregó la herramienta <strong>${prestamo.inventario?.nombre_herramienta || 'Desconocida'}</strong> en buen estado?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'boton-cancelar'
        }, {
          text: 'Sí, recibir',
          handler: () => {
            // IMPORTANTE: Usamos herramientaId que es el ID del documento en inventario
            this.procesarDevolucion(prestamo.id, prestamo.herramientaId);
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarDevolucion(idPrestamo: string, idHerramienta: string) {
    // registrarDevolucion debe marcar el préstamo como 'Devuelto' y la herramienta como 'Disponible'
    const resultado = await this.almacenService.registrarDevolucion(idPrestamo, idHerramienta);

    if (resultado.exito) {
      this.mostrarToast('Herramienta recibida y disponible.', 'success');
      // Recargamos la lista para que el item desaparezca de la vista
      await this.cargarPendientes();
    } else {
      this.mostrarToast('Error al procesar la devolución.', 'danger');
    }
  }

  async mostrarToast(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom'
    });
    toast.present();
  }
}