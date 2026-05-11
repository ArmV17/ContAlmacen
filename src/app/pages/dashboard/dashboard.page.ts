import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { buildOutline, menu, alertCircleOutline, mailUnreadOutline } from 'ionicons/icons';

// Importamos el servicio actualizado para Firebase
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DashboardPage {

  // Lista de préstamos procesada para mostrar en la interfaz
  prestamosActivos: any[] = []; 
  
  // Contadores para las tarjetas informativas (KPIs)
  totalActivos: number = 0;
  totalVencidos: number = 0;

  // Control de notificaciones
  alertasEnviadasHoy: boolean = false;

  constructor(private almacenService: AlmacenService) { 
    // Registramos los iconos necesarios (añadimos mailUnreadOutline para el indicador)
    addIcons({ buildOutline, menu, alertCircleOutline, mailUnreadOutline });
  }

  /**
   * Se ejecuta cada vez que el usuario entra a la pestaña del Dashboard.
   */
  async ionViewWillEnter() {
    await this.cargarDashboard();
    // Ejecutamos la lógica de notificaciones automáticas
    await this.verificarNotificacionesDelDia();
  }

  /**
   * Obtiene los datos del servicio de Firebase y calcula los totales.
   */
  async cargarDashboard() {
    try {
      const datos = await this.almacenService.obtenerPrestamosDashboard();
      this.prestamosActivos = datos;

      // Calculamos los totales
      this.totalActivos = this.prestamosActivos.filter(p => p.estado === 'Activo').length;
      this.totalVencidos = this.prestamosActivos.filter(p => p.estado === 'Vencido').length;

      console.log('Dashboard cargado con éxito:', this.prestamosActivos.length, 'registros.');
    } catch (error) {
      console.error('Error al cargar los datos del Dashboard:', error);
      this.prestamosActivos = [];
      this.totalActivos = 0;
      this.totalVencidos = 0;
    }
  }

  /**
   * Lógica proactiva: Revisa si hay que mandar correos hoy
   */
  async verificarNotificacionesDelDia() {
    const hoyStr = new Date().toISOString().split('T')[0];
    
    // 1. Revisamos en Firebase si ya se enviaron hoy
    this.alertasEnviadasHoy = await this.almacenService.comprobarSiYaSeNotificoHoy(hoyStr);

    if (!this.alertasEnviadasHoy) {
      console.log("Iniciando verificación automática de entregas para hoy...");
      
      // 2. Buscamos en Firebase préstamos que vencen hoy
      const prestamosHoy = await this.almacenService.obtenerPrestamosParaHoy(hoyStr);

      if (prestamosHoy.length > 0) {
        for (const p of prestamosHoy) {
          // Si el registro tiene correo, disparamos a Google Script
          if (p.receptor_correo) {
            await this.almacenService.enviarAlertaGoogle({
              to_email: p.receptor_correo,
              nombre: p.receptor_nombre,
              herramienta: p.herramienta_nombre,
              fecha_entrega: hoyStr
            });
          }
        }
        // 3. Marcamos como "Notificado" en Firebase para que no se repita al volver a entrar
        await this.almacenService.registrarNotificacionExitosa(hoyStr);
        this.alertasEnviadasHoy = true;
        console.log("Alertas diarias enviadas con éxito.");
      }
    } else {
      console.log("Las notificaciones de hoy ya fueron procesadas anteriormente.");
    }
  }

  /**
   * Refresco manual
   */
  async doRefresh(event: any) {
    await this.cargarDashboard();
    await this.verificarNotificacionesDelDia();
    event.target.complete();
  }
}