import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AlmacenService {
  
  // Variable que guarda la conexión activa a tu base de datos
  private supabase: SupabaseClient;

  constructor() {
    // Inicializamos Supabase con las credenciales
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ==========================================
  // MÉTODOS DE CONEXIÓN A TABLAS
  // ==========================================

  /**
   * Obtiene todas las herramientas de la tabla 'inventario'
   */
  async obtenerInventario() {
    const { data, error } = await this.supabase
      .from('inventario')
      .select('*');

    if (error) {
      console.error('Error al conectar con Supabase:', error.message);
      return [];
    }

    return data; 
  }

  /**
   * Ejemplo para insertar un nuevo registro en la tabla 'alumnos'
   */
  async registrarAlumno(matricula: string, nombre: string, carrera: string, grado: string) {
    const { data, error } = await this.supabase
      .from('alumnos')
      .insert([
        { 
          matricula: matricula, 
          nombre: nombre, 
          carrera: carrera, 
          grado: grado 
        }
      ]);

    if (error) {
      console.error('Error al registrar alumno:', error.message);
      return false;
    }
    return true;
  }

  /**
   * Obtiene los préstamos activos y vencidos para el Dashboard
   * haciendo "JOIN" con las tablas de alumnos e inventario
   */
  async obtenerPrestamosDashboard() {
    const { data, error } = await this.supabase
      .from('prestamos')
      .select(`
        id,
        fecha_salida,
        estado,
        alumnos (nombre, carrera),
        inventario (nombre_herramienta)
      `)
      // Solo queremos ver los que están en la calle
      .in('estado', ['Activo', 'Vencido']) 
      // Ordenamos para ver los más antiguos primero
      .order('fecha_salida', { ascending: true });

    if (error) {
      console.error('Error al obtener préstamos:', error.message);
      return [];
    }

    return data;
  }

/**
   * Registra un nuevo préstamo en la base de datos
   * y actualiza el estado de la herramienta en el inventario.
   */
  async registrarNuevoPrestamo(matricula: string, numHerramienta: string, numEmpleado: string) {
    // 1. Insertamos el registro en la tabla prestamos
    const { data, error } = await this.supabase
      .from('prestamos')
      .insert([
        {
          matricula_alumno: matricula,
          num_herramienta: numHerramienta,
          num_empleado: numEmpleado,
          estado: 'Activo'
        }
      ]);

    if (error) {
      console.error('Error de Supabase:', error.message);
      return { exito: false, mensaje: error.message };
    }

    // 2. Si se prestó bien, actualizamos el estado de la herramienta
    await this.supabase
      .from('inventario')
      .update({ estado: 'Prestado' })
      .eq('num_herramienta', numHerramienta);

    return { exito: true, mensaje: 'Préstamo guardado correctamente' };
  }

  /**
   * Obtiene la lista específica para la pantalla de devoluciones
   */
  async obtenerPrestamosPendientes() {
    const { data, error } = await this.supabase
      .from('prestamos')
      .select(`
        id,
        num_herramienta,
        estado,
        alumnos (matricula, nombre),
        inventario (nombre_herramienta)
      `)
      .in('estado', ['Activo', 'Vencido'])
      .order('fecha_salida', { ascending: true });

    if (error) {
      console.error('Error al obtener pendientes:', error.message);
      return [];
    }
    return data;
  }

  /**
   * Procesa la devolución: Cierra el préstamo y libera la herramienta
   */
  async registrarDevolucion(idPrestamo: string, numHerramienta: string) {
    // 1. Cerramos el préstamo poniendo la fecha actual
    const { error: errorPrestamo } = await this.supabase
      .from('prestamos')
      .update({
        estado: 'Devuelto',
        fecha_devolucion: new Date().toISOString() // Hora exacta de entrega
      })
      .eq('id', idPrestamo);

    if (errorPrestamo) return { exito: false };

    // 2. Liberamos la herramienta en el inventario
    const { error: errorInventario } = await this.supabase
      .from('inventario')
      .update({ estado: 'Disponible' })
      .eq('num_herramienta', numHerramienta);

    if (errorInventario) return { exito: false };

    return { exito: true };
  }
}