import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class AlmacenService {
  
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ==========================================
  // INVENTARIO
  // ==========================================
  async obtenerInventario() {
    const { data, error } = await this.supabase.from('inventario').select('*');
    if (error) { console.error('Error al conectar:', error.message); return []; }
    return data; 
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  async obtenerPrestamosDashboard() {
    const { data, error } = await this.supabase
      .from('prestamos')
      .select(`id, fecha_salida, estado, alumnos (nombre, carrera), inventario (nombre_herramienta)`)
      .in('estado', ['Activo', 'Vencido']) 
      .order('fecha_salida', { ascending: true });
    
    if (error) { console.error('Error:', error.message); return []; }

    // DESCIFRADO: Convertimos el nombre incomprensible a texto legible para la pantalla
    return data.map((prestamo: any) => {
      if (prestamo.alumnos && prestamo.alumnos.nombre) {
        try {
          // Intentamos descifrar. Si falla (ej. si el dato se metió antes del cifrado), lo deja como está.
          const nombreDescifrado = this.desencriptarTexto(prestamo.alumnos.nombre);
          if (nombreDescifrado) prestamo.alumnos.nombre = nombreDescifrado;
        } catch (e) { /* Ignorar si no está cifrado */ }
      }
      return prestamo;
    });
  }

  // ==========================================
  // NUEVO PRÉSTAMO
  // ==========================================
  async registrarNuevoPrestamo(matricula: string, numHerramienta: string, numEmpleado: string) {
    const { error } = await this.supabase.from('prestamos').insert([{
      matricula_alumno: matricula,
      num_herramienta: numHerramienta,
      num_empleado: numEmpleado,
      estado: 'Activo'
    }]);

    if (error) return { exito: false, mensaje: error.message };

    await this.supabase.from('inventario').update({ estado: 'Prestado' }).eq('num_herramienta', numHerramienta);
    return { exito: true, mensaje: 'Préstamo guardado correctamente' };
  }

  // ==========================================
  // DEVOLUCIONES
  // ==========================================
  async obtenerPrestamosPendientes() {
    const { data, error } = await this.supabase
      .from('prestamos')
      .select(`id, num_herramienta, estado, alumnos (matricula, nombre), inventario (nombre_herramienta)`)
      .in('estado', ['Activo', 'Vencido'])
      .order('fecha_salida', { ascending: true });
    
    if (error) { console.error('Error:', error.message); return []; }

    // DESCIFRADO: Igual que en el Dashboard, hacemos legible el nombre del alumno
    return data.map((prestamo: any) => {
      if (prestamo.alumnos && prestamo.alumnos.nombre) {
        try {
          const nombreDescifrado = this.desencriptarTexto(prestamo.alumnos.nombre);
          if (nombreDescifrado) prestamo.alumnos.nombre = nombreDescifrado;
        } catch (e) { /* Ignorar si no está cifrado */ }
      }
      return prestamo;
    });
  }

  async registrarDevolucion(idPrestamo: string, numHerramienta: string) {
    const { error: errorPrestamo } = await this.supabase.from('prestamos')
      .update({ estado: 'Devuelto', fecha_devolucion: new Date().toISOString() })
      .eq('id', idPrestamo);

    if (errorPrestamo) return { exito: false };

    const { error: errorInventario } = await this.supabase.from('inventario')
      .update({ estado: 'Disponible' }).eq('num_herramienta', numHerramienta);

    if (errorInventario) return { exito: false };

    return { exito: true };
  }

  // ==========================================
  // FUNCIONES DE SEGURIDAD (CRIPTOGRAFÍA)
  // ==========================================
  encriptarTexto(texto: string): string {
    return CryptoJS.AES.encrypt(texto, environment.llaveCifrado).toString();
  }

  desencriptarTexto(textoCifrado: string): string {
    const bytes = CryptoJS.AES.decrypt(textoCifrado, environment.llaveCifrado);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  hashearPassword(password: string): string {
    return CryptoJS.SHA256(password).toString();
  }

  // ==========================================
  // ADMINISTRACIÓN (ALTAS CON CIFRADO)
  // ==========================================
  async registrarAlumno(alumno: any) {
    const { error } = await this.supabase.from('alumnos').insert([{
      matricula: alumno.matricula, 
      nombre: this.encriptarTexto(alumno.nombre), // CIFRADO 
      carrera: alumno.carrera,
      grado: alumno.grado
    }]);
    return { exito: !error, mensaje: error?.message };
  }

  async registrarHerramienta(herramienta: any) {
    const { error } = await this.supabase.from('inventario').insert([{
      num_herramienta: herramienta.codigo, 
      nombre_herramienta: herramienta.nombre, 
      estado: 'Disponible'
    }]);
    return { exito: !error, mensaje: error?.message };
  }

  async registrarEmpleado(empleado: any) {
    const { error } = await this.supabase.from('trabajadores').insert([{
      num_empleado: empleado.numEmpleado, 
      nombre: this.encriptarTexto(empleado.nombre), // CIFRADO (Se agregó)
      password: this.hashearPassword(empleado.password), // HASHED
      rol: empleado.rol
    }]);
    return { exito: !error, mensaje: error?.message };
  }

  // --- MÉTODOS DE EDICIÓN Y ELIMINACIÓN ---

  async eliminarRegistro(tabla: string, columnaId: string, valorId: string) {
    const { error } = await this.supabase.from(tabla).delete().eq(columnaId, valorId);
    return { exito: !error, mensaje: error?.message };
  }

  async actualizarRegistro(tabla: string, columnaId: string, valorId: string, datos: any) {
    const { error } = await this.supabase.from(tabla).update(datos).eq(columnaId, valorId);
    return { exito: !error, mensaje: error?.message };
  }

  // Método para obtener todos los empleados (los alumnos e inventario ya los tenemos)
  async obtenerEmpleados() {
    const { data, error } = await this.supabase.from('trabajadores').select('*');
    if (error) return [];
    
    return data.map((emp: any) => {
      try {
        const nombreDescifrado = this.desencriptarTexto(emp.nombre);
        if (nombreDescifrado) emp.nombre = nombreDescifrado;
      } catch (e) { /* No cifrado */ }
      return emp;
    });
  }
}