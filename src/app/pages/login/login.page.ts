import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, Platform, MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { AlmacenService } from '../../services/almacen.service';
import { addIcons } from 'ionicons';
import { personOutline, lockClosedOutline, arrowForwardOutline, businessOutline } from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
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
    private menuCtrl: MenuController
  ) {
    // Iconos para la identidad visual de CAMPS
    addIcons({ personOutline, lockClosedOutline, arrowForwardOutline, businessOutline });
  }

  ngOnInit() {
    // 1. SOLUCIÓN A IMAGE_8EE21E.JPG: Auto-Login
    // Si el usuario ya tiene sesión, lo mandamos directo adentro
    const rolGuardado = localStorage.getItem('userRol');
    if (rolGuardado) {
      this.redigirPorRol(rolGuardado);
      return;
    }

    // 2. Bloqueo de historial para evitar retrocesos vacíos
    this.bloquearRetroceso();
  }

  ionViewWillEnter() {
    // Forzamos que el menú lateral esté desactivado y cerrado en el Login
    this.menuCtrl.enable(false);
    this.menuCtrl.close();
  }

  /**
   * Evita que el usuario use las flechas del navegador para "navegar" en el login
   */
  bloquearRetroceso() {
    window.history.pushState(null, '', window.location.href);
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href);
    };
  }

  /**
   * Navegación inteligente basada en el rol del trabajador
   */
  redigirPorRol(rol: string) {
    this.menuCtrl.enable(true); // Activamos el menú antes de entrar
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
      // Intentamos el acceso con los datos de la colección 'trabajadores'
      const res = await this.almacenService.login(this.numEmpleado, this.password);

      if (res.exito) {
        // Guardamos los datos de sesión
        localStorage.setItem('userRol', res.rol || 'Staff');
        localStorage.setItem('userName', res.nombre || 'Usuario');

        // Ejecutamos la redirección
        this.redigirPorRol(res.rol || 'Staff');

        this.mostrarMensaje(`Bienvenido, ${res.nombre || 'Usuario'}`, 'success');
      } else {
        this.mostrarMensaje(res.mensaje || 'Datos de acceso incorrectos', 'danger');
      }
    } catch (error) {
      console.error('Error en Login:', error);
      this.mostrarMensaje('No se pudo conectar con el servidor', 'danger');
    } finally {
      loading.dismiss();
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