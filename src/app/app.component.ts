import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 

// 👇 IMPORTAMOS EL SERVICIO DE ALMACÉN (Crucial para usar el candado)
import { AlmacenService } from './services/almacen.service';

// 👇 IMPORTAMOS AlertController y MenuController QUE NECESITA EL VIGILANTE
import { 
  IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, 
  IonTitle, IonContent, IonList, IonMenuToggle, IonItem, 
  IonIcon, IonLabel, IonSplitPane, IonText, IonBadge,
  MenuController, AlertController 
} from '@ionic/angular/standalone';

// Importación de íconos
import { addIcons } from 'ionicons';
import { 
  homeOutline, addCircleOutline, checkmarkCircleOutline, 
  listOutline, settingsOutline, logOutOutline, businessOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonApp, IonRouterOutlet, IonMenu, IonHeader, IonToolbar, 
    IonTitle, IonContent, IonList, IonMenuToggle, IonItem, 
    IonIcon, IonLabel, IonSplitPane, IonText, IonBadge
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  
  private temporizadorInactividad: any;
  private readonly TIEMPO_LIMITE = 300000; // 5 minutos 

  constructor(
    private router: Router,
    private almacenService: AlmacenService,  
    private menuCtrl: MenuController,       
    private alertController: AlertController  
  ) {
    addIcons({ 
      homeOutline, 
      addCircleOutline, 
      checkmarkCircleOutline, 
      listOutline, 
      settingsOutline, 
      logOutOutline,
      businessOutline 
    });
  }

  ngOnInit() {
    this.iniciarTemporizador();
  }

  ngOnDestroy() {
    this.limpiarTemporizador();
  }

  // ==========================================
  // ESTADOS DEL USUARIO
  // ==========================================

  esAdmin(): boolean {
    const rol = localStorage.getItem('userRol');
    return rol === 'Admin';
  }

  obtenerNombreUsuario(): string {
    return localStorage.getItem('userName') || 'Usuario';
  }
  
  sesionIniciada(): boolean {
    return localStorage.getItem('userRol') !== null;
  }

  // ==========================================
  // VIGILANTE DE INACTIVIDAD Y CERRADO FORZOSO
  // ==========================================

  // Escuchamos el teclado, ratón o toques táctiles
  @HostListener('window:mousemove')
  @HostListener('window:keydown')
  @HostListener('window:touchstart')
  @HostListener('window:click')
  resetearTemporizador() {
    if (this.sesionIniciada()) {
      this.iniciarTemporizador();
    }
  }

  @HostListener('window:beforeunload', ['$event'])
  liberarCuentaAlCerrarPestana() {
    const numEmp = localStorage.getItem('numEmpleado');
    if (numEmp) {
      this.almacenService.actualizarEstadoSesion(numEmp, false);
    }
  }

  iniciarTemporizador() {
    this.limpiarTemporizador();
    this.temporizadorInactividad = setTimeout(() => {
      this.cerrarSesionPorInactividad();
    }, this.TIEMPO_LIMITE);
  }

  limpiarTemporizador() {
    if (this.temporizadorInactividad) {
      clearTimeout(this.temporizadorInactividad);
    }
  }

  async cerrarSesionPorInactividad() {
    const numEmp = localStorage.getItem('numEmpleado');
    
    if (numEmp) {
      await this.almacenService.actualizarEstadoSesion(numEmp, false);
      localStorage.clear();
      this.menuCtrl.close();
      this.router.navigate(['/login'], { replaceUrl: true });

      const alert = await this.alertController.create({
        header: 'Sesión Expirada',
        message: 'Tu sesión se ha cerrado automáticamente por seguridad después de 5 minutos de inactividad.',
        buttons: ['Entendido'],
        cssClass: 'alerta-peligro'
      });
      await alert.present();
    }
  }

  // ==========================================
  // CIERRE DE SESIÓN MANUAL (BOTÓN)
  // ==========================================

  async cerrarSesion() {
    const numEmp = localStorage.getItem('numEmpleado');
    
    if (numEmp) {
      await this.almacenService.actualizarEstadoSesion(numEmp, false);
    }

    localStorage.clear();
    this.menuCtrl.close();
    this.router.navigate(['/login'], { replaceUrl: true });
  }
}