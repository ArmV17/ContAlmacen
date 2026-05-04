import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';

// Importamos los íconos necesarios para esta pantalla
import { addIcons } from 'ionicons';
import { saveOutline, personOutline, buildOutline, barcodeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-nuevo-prestamo',
  templateUrl: './nuevo-prestamo.page.html',
  styleUrls: ['./nuevo-prestamo.page.scss'],
  standalone: true, 
  imports: [IonicModule, CommonModule, FormsModule]
})
export class NuevoPrestamoPage implements OnInit {

  // Objeto para guardar lo que se escriba en el formulario
  prestamo = {
    matricula: '',
    carrera: '',
    herramientaId: ''
  };

  constructor(private toastController: ToastController) {
    // Registramos los íconos
    addIcons({ saveOutline, personOutline, buildOutline, barcodeOutline });
  }

  ngOnInit() { }

  async guardarPrestamo() {
    // Validación básica
    if (!this.prestamo.matricula || !this.prestamo.herramientaId) {
      this.mostrarMensaje('Falta la matrícula o la herramienta.', 'warning');
      return;
    }

    // Aquí irá la conexión a Supabase más adelante
    console.log('Guardando préstamo en base de datos...', this.prestamo);

    // Simulamos el éxito
    this.mostrarMensaje('Préstamo autorizado correctamente.', 'success');

    // Limpiamos el formulario para el siguiente alumno
    this.prestamo = { matricula: '', carrera: '', herramientaId: '' };
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2500,
      color: color,
      position: 'bottom',
      cssClass: 'toast-personalizado'
    });
    toast.present();
  }
}