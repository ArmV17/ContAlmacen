import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { buildOutline, menu } from 'ionicons/icons';

// Importamos el servicio para conectarnos a Supabase
import { AlmacenService } from '../../services/almacen.service';

interface PrestamoDashboard {
  id: string;
  fecha_salida: string;
  estado: string;
  alumnos: { nombre: string; carrera: string; };
  inventario: { nombre_herramienta: string; };
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class DashboardPage {

  // Iniciamos la lista vacía (como tu base de datos real)
  prestamosActivos: PrestamoDashboard[] = [];
  
  // Contadores inicializados en cero
  totalActivos: number = 0;
  totalVencidos: number = 0;

  // Inyectamos el servicio en el constructor
  constructor(private almacenService: AlmacenService) { 
    addIcons({ buildOutline, menu });
  }

  // Se ejecuta SIEMPRE que la vista está a punto de mostrarse
  async ionViewWillEnter() {
    await this.cargarDashboard();
  }

  async cargarDashboard() {
    // 1. Descargamos los datos reales de Supabase
    const datos = await this.almacenService.obtenerPrestamosDashboard();
    
    // 2. Se los asignamos a nuestra variable de la pantalla
    // Usamos "as any" momentáneamente para que TypeScript no se pelee con la estructura de Supabase
    this.prestamosActivos = datos as any;

    // 3. Calculamos las tarjetas sumando cuántos hay de cada estado
    this.totalActivos = this.prestamosActivos.filter(p => p.estado === 'Activo').length;
    this.totalVencidos = this.prestamosActivos.filter(p => p.estado === 'Vencido').length;
  }

}