import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { buildOutline, menu, alertCircleOutline } from 'ionicons/icons';

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

  constructor(private almacenService: AlmacenService) { 
    // Registramos los iconos necesarios
    addIcons({ buildOutline, menu, alertCircleOutline });
  }

  /**
   * Se ejecuta cada vez que el usuario entra a la pestaña del Dashboard.
   * Esto garantiza que los datos estén siempre actualizados.
   */
  async ionViewWillEnter() {
    await this.cargarDashboard();
  }

  /**
   * Obtiene los datos del servicio de Firebase y calcula los totales.
   */
  async cargarDashboard() {
    try {
      // 1. Llamamos al método del servicio que hace el cruce de datos (Join manual)
      const datos = await this.almacenService.obtenerPrestamosDashboard();
      
      // 2. Asignamos los resultados a la variable vinculada con el HTML
      this.prestamosActivos = datos;

      // 3. Calculamos los totales filtrando por el campo 'estado'
      // Nota: Asegúrate de que en Firebase el estado diga exactamente 'Activo' o 'Vencido'
      this.totalActivos = this.prestamosActivos.filter(p => p.estado === 'Activo').length;
      this.totalVencidos = this.prestamosActivos.filter(p => p.estado === 'Vencido').length;

      console.log('Dashboard cargado con éxito:', this.prestamosActivos.length, 'registros.');
      
    } catch (error) {
      console.error('Error al cargar los datos del Dashboard:', error);
      // En caso de error, reseteamos las variables para evitar mostrar datos basura
      this.prestamosActivos = [];
      this.totalActivos = 0;
      this.totalVencidos = 0;
    }
  }

  /**
   * Método opcional para refrescar manualmente (si usas un ion-refresher)
   */
  async doRefresh(event: any) {
    await this.cargarDashboard();
    event.target.complete();
  }

}