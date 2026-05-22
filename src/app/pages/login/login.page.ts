import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, arrowForwardOutline, businessOutline } from 'ionicons/icons';

import { 
  ToastController, LoadingController, Platform, MenuController, AlertController, // 👇 AGREGAMOS AlertController
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

  numEmpleado: string = '';
  password: string = '';

  constructor(
    private almacenService: AlmacenService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController,
    private platform: Platform,
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
    this.bloquearRetroceso();
  }

  ionViewWillEnter() {
    this.menuCtrl.enable(false);
    this.menuCtrl.close();
  }

  bloquearRetroceso() {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };
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
        
        // 👇 1. VERIFICACIÓN DEL CANDADO DE SEGURIDAD
        if (res.en_linea === true) {
          await loading.dismiss(); // Quitamos el circulito de carga
          const alert = await this.alertController.create({
            header: 'Acceso Denegado',
            message: 'Esta cuenta ya tiene una sesión iniciada en otro dispositivo. Por seguridad, cierra la otra sesión primero.',
            buttons: ['Entendido'],
            cssClass: 'alerta-peligro' // Opcional, si tienes estilos para alertas
          });
          await alert.present();
          return; // 🛑 Detenemos el código aquí, NO entra.
        }

        // 👇 2. CERRAMOS EL CANDADO PARA QUE NADIE MÁS ENTRE
        await this.almacenService.actualizarEstadoSesion(this.numEmpleado, true);

        // Guardamos los datos de la sesión local
        localStorage.setItem('userRol', res.rol || 'Staff');
        localStorage.setItem('userName', res.nombre || 'Usuario');
        // 👇 3. GUARDAMOS EL NUM_EMPLEADO PARA SABER A QUIÉN ABRIRLE EL CANDADO AL SALIR
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
      // Usamos un try-catch silencioso para evitar errores si el loading ya se cerró arriba
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