import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { saveOutline, personOutline, buildOutline, barcodeOutline, menu } from 'ionicons/icons';

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

  prestamo = {
    matricula: '',
    herramientaId: ''
  };

  // Por ahora "quemamos" (hardcodeamos) el ID de un empleado 
  // Más adelante esto vendrá del inicio de sesión
  empleadoActual = 'EMP-01';

  constructor(
    private toastController: ToastController,
    private almacenService: AlmacenService
  ) {
    addIcons({ saveOutline, personOutline, buildOutline, barcodeOutline, menu });
  }

  ngOnInit() { }

  async guardarPrestamo() {
    if (!this.prestamo.matricula || !this.prestamo.herramientaId) {
      this.mostrarMensaje('Falta la matrícula o el código de herramienta.', 'warning');
      return;
    }

    // Llamamos a Supabase
    const resultado = await this.almacenService.registrarNuevoPrestamo(
      this.prestamo.matricula,
      this.prestamo.herramientaId,
      this.empleadoActual
    );

    if (resultado.exito) {
      this.mostrarMensaje('Préstamo autorizado y registrado.', 'success');
      // Limpiamos los campos
      this.prestamo = { matricula: '', herramientaId: '' };
    } else {
      // Si la matrícula no existe o la herramienta no existe, mostrará error
      this.mostrarMensaje('Error: Verifica que el alumno y la herramienta existan.', 'danger');
    }
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3500,
      color: color,
      position: 'bottom',
      cssClass: 'toast-personalizado'
    });
    toast.present();
  }
}