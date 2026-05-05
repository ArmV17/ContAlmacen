import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, buildOutline, menu } from 'ionicons/icons';

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
    addIcons({ checkmarkCircleOutline, alertCircleOutline, buildOutline, menu });
  }

  // Recarga la lista real desde Supabase cada vez que entras a la vista
  async ionViewWillEnter() {
    await this.cargarPendientes();
  }

  async cargarPendientes() {
    this.prestamosPendientes = await this.almacenService.obtenerPrestamosPendientes();
  }

  async confirmarDevolucion(prestamo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Devolución',
      // Usamos la estructura anidada de Supabase
      message: `¿El alumno <strong>${prestamo.alumnos.nombre}</strong> entregó la herramienta <strong>${prestamo.inventario.nombre_herramienta}</strong> en buen estado?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'boton-cancelar'
        }, {
          text: 'Sí, recibir',
          handler: () => {
            // Mandamos el ID del préstamo y el de la herramienta para liberar ambos
            this.procesarDevolucion(prestamo.id, prestamo.num_herramienta);
          }
        }
      ]
    });

    await alert.present();
  }

  async procesarDevolucion(idPrestamo: string, numHerramienta: string) {
    const resultado = await this.almacenService.registrarDevolucion(idPrestamo, numHerramienta);

    if (resultado.exito) {
      const toast = await this.toastController.create({
        message: 'Herramienta devuelta y disponible en inventario.',
        duration: 2500,
        color: 'success',
        position: 'bottom'
      });
      toast.present();

      // Recargamos la lista para que desaparezca el que acabamos de devolver
      await this.cargarPendientes();
    } else {
      const toast = await this.toastController.create({
        message: 'Error al procesar la devolución.',
        duration: 2500,
        color: 'danger',
        position: 'bottom'
      });
      toast.present();
    }
  }
}