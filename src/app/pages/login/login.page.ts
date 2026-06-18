import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, arrowForwardOutline, businessOutline } from 'ionicons/icons';

import { 
  ToastController, LoadingController, MenuController, AlertController,
  IonContent, IonIcon, IonCard, IonCardContent, IonItem, IonInput, IonButton 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    IonContent, IonIcon, IonCard, IonCardContent, IonItem, IonInput, IonButton
  ]
})
export class LoginPage implements OnInit {

  // Referencias a los inputs para manejar el foco
  @ViewChild('inputEmpleado') inputEmpleado: any;
  @ViewChild('inputPassword') inputPassword: any;

  numEmpleado: string = '';
  password: string = '';

  constructor(
    private almacenService: AlmacenService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private menuCtrl: MenuController,
    private alertController: AlertController
  ) {
    addIcons({ personOutline, lockClosedOutline, arrowForwardOutline, businessOutline });
  }

  ngOnInit() {
    const rolGuardado = localStorage.getItem('userRol');
    if (rolGuardado) {
      this.redigirPorRol(rolGuardado);
      return;
    }
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.menuCtrl.close();
  }

  // Función para mover el foco del input empleado al de contraseña
  focusPassword() {
    setTimeout(() => {
      this.inputPassword.setFocus();
    }, 100);
  }

  redigirPorRol(rol: string) {
    this.menuCtrl.enable(true); 
    if (rol === 'Admin') {
      this.router.navigate(['/administracion'], { replaceUrl: true });
    } else {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  async entrar() {
    if (!this.numEmpleado || !this.password) {
      this.mostrarMensaje('Ingresa tu número de empleado y contraseña', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Verificando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const res = await this.almacenService.login(this.numEmpleado, this.password);

      if (res.exito) {
        // 1. VERIFICACIÓN DEL CANDADO DE SEGURIDAD
        if (res.en_linea === true) {
          await loading.dismiss();
          const alert = await this.alertController.create({
            header: 'Acceso Denegado',
            message: 'Esta cuenta ya tiene una sesión iniciada en otro dispositivo.',
            buttons: ['Entendido']
          });
          await alert.present();
          return;
        }

        // 2. CERRAMOS EL CANDADO
        await this.almacenService.actualizarEstadoSesion(this.numEmpleado, true);

        // Guardamos sesión
        localStorage.setItem('userRol', res.rol || 'Staff');
        localStorage.setItem('userName', res.nombre || 'Usuario');
        localStorage.setItem('numEmpleado', this.numEmpleado);

        this.redigirPorRol(res.rol || 'Staff');
        this.mostrarMensaje(`Bienvenido a CAMPS, ${res.nombre || 'Usuario'}`, 'success');
      } else {
        this.mostrarMensaje(res.mensaje || 'Datos de acceso incorrectos', 'danger');
      }
    } catch (error) {
      console.error('Error en Login:', error);
      this.mostrarMensaje('No se pudo conectar con el servidor', 'danger');
    } finally {
      try { await loading.dismiss(); } catch (e) {}
    }
  }

  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 2000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }
}