import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';

// Íconos para la interfaz
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, buildOutline } from 'ionicons/icons';

@Component({
  selector: 'app-devoluciones',
  templateUrl: './devoluciones.page.html',
  styleUrls: ['./devoluciones.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DevolucionesPage implements OnInit {

  // Lista de préstamos activos simulados
  prestamosPendientes = [
    {
      id: 'P-001',
      alumno: 'Juan Pérez',
      matricula: '17001122',
      herramienta: 'Multímetro Fluke',
      codigoHerramienta: 'MULT-04',
      estado: 'A tiempo'
    },
    {
      id: 'P-002',
      alumno: 'María Gómez',
      matricula: '17003344',
      herramienta: 'Cautín de estación',
      codigoHerramienta: 'CAUT-01',
      estado: 'Vencido'
    }
  ];

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ checkmarkCircleOutline, alertCircleOutline, buildOutline });
  }

  ngOnInit() {
  }

  // Método para confirmar la devolución
  async confirmarDevolucion(prestamo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Devolución',
      message: `¿El alumno <strong>${prestamo.alumno}</strong> entregó la herramienta <strong>${prestamo.herramienta}</strong> en buen estado?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'boton-cancelar'
        }, {
          text: 'Sí, recibir',
          handler: () => {
            this.procesarDevolucion(prestamo.id);
          }
        }
      ]
    });

    await alert.present();
  }

  // Método que simula la actualización en la base de datos
  async procesarDevolucion(id: string) {
    // Filtramos la lista para quitar el préstamo devuelto (simulando la DB)
    this.prestamosPendientes = this.prestamosPendientes.filter(p => p.id !== id);

    const toast = await this.toastController.create({
      message: 'Herramienta devuelta y registrada correctamente.',
      duration: 2500,
      color: 'success',
      position: 'bottom'
    });
    toast.present();
  }
}