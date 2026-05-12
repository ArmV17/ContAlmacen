import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular'; 
import { addIcons } from 'ionicons';
import { buildOutline, menu, alertCircleOutline, mailOutline, sendOutline } from 'ionicons/icons';
import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DashboardPage {

  prestamosActivos: any[] = []; 
  totalActivos: number = 0;
  totalVencidos: number = 0;

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private loadingController: LoadingController
  ) { 
    addIcons({ buildOutline, menu, alertCircleOutline, mailOutline, sendOutline });
  }

  async ionViewWillEnter() {
    await this.cargarDashboard();
  }

  async cargarDashboard() {
    try {
      const datos = await this.almacenService.obtenerPrestamosDashboard();
      this.prestamosActivos = datos;
      this.totalActivos = this.prestamosActivos.filter(p => p.estado === 'Activo').length;
      this.totalVencidos = this.prestamosActivos.filter(p => p.estado === 'Vencido').length;
    } catch (error) {
      console.error('Error dashboard:', error);
    }
  }

  /**
   * FUNCIÓN PARA MOSTRAR MENSAJES (Soluciona el error TS2339)
   */
  async mostrarMensaje(mensaje: string, color: string) {
    const toast = await this.toastController.create({
      message: mensaje,
      duration: 3000,
      color: color,
      position: 'bottom'
    });
    await toast.present();
  }

  async lanzarAlertasManuales() {
    const loading = await this.loadingController.create({
      message: 'Analizando fechas y enviando correos...',
    });
    await loading.present();

    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Normalizamos a las 00:00 para comparar solo días

      // 1. Filtramos y mapeamos en un solo paso
      const contactosParaEnviar = this.prestamosActivos
        .filter(p => {
          const fechaPactada = p.fecha_devolucion_pactada.toDate();
          fechaPactada.setHours(0, 0, 0, 0);
          
          // REGLA: Si la fecha es hoy O es menor que hoy (Vencido), se incluye.
          return fechaPactada.getTime() <= hoy.getTime();
        })
        .map(p => {
          const fechaPactada = p.fecha_devolucion_pactada.toDate();
          fechaPactada.setHours(0, 0, 0, 0);

          return {
            correo: p.receptor_correo,
            nombre: p.receptor_nombre,
            herramienta: p.herramienta_nombre,
            esRetraso: fechaPactada.getTime() < hoy.getTime() // Menor que hoy = Vencido
          };
        });

      // 2. Si después del filtro no hay nadie, avisamos y salimos
      if (contactosParaEnviar.length === 0) {
        await this.mostrarMensaje('No hay entregas para hoy ni equipos vencidos', 'medium');
        loading.dismiss();
        return;
      }

      // 3. Enviamos solo la lista filtrada
      await this.almacenService.enviarAlertasMasivas(contactosParaEnviar);
      
      await this.mostrarMensaje(`¡Proceso completado! Se notificó a ${contactosParaEnviar.length} personas.`, 'success');

    } catch (error) {
      console.error(error);
      await this.mostrarMensaje('Error al procesar las alertas', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async doRefresh(event: any) {
    await this.cargarDashboard();
    event.target.complete();
  }
}