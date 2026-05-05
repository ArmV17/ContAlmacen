import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  getDoc,
  orderBy
} from '@angular/fire/firestore';
import { environment } from '../../environments/environment';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class AlmacenService {

  constructor(private firestore: Firestore) { }

  // ==========================================
  // SEGURIDAD Y CRIPTOGRAFÍA
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
  // INVENTARIO
  // ==========================================
  async obtenerInventario() {
    const colRef = collection(this.firestore, 'inventario');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ==========================================
  // DASHBOARD & DEVOLUCIONES (Con cruce de datos manual)
  // ==========================================
  async obtenerPrestamosDashboard() {
    try {
      const colRef = collection(this.firestore, 'prestamos');
      // Quitamos el orderBy temporalmente para que la consulta no falle por falta de índices
      const q = query(colRef, where('estado', 'in', ['Activo', 'Vencido']));
      const snapshot = await getDocs(q);

      console.log("Documentos brutos encontrados en Firebase:", snapshot.size);

      const prestamos = await Promise.all(snapshot.docs.map(async (d) => {
        const data: any = d.data();
        
        // Buscamos al alumno usando la matrícula como ID del documento
        const aluSnap = await getDoc(doc(this.firestore, 'alumnos', data['matricula_alumno']));
        const aluData: any = aluSnap.exists() ? aluSnap.data() : { nombre: 'Alumno no encontrado', carrera: 'N/A' };
        
        // Buscamos la herramienta usando el código como ID del documento
        const invSnap = await getDoc(doc(this.firestore, 'inventario', data['num_herramienta']));
        const invData: any = invSnap.exists() ? invSnap.data() : { nombre_herramienta: 'Herramienta no encontrada' };

        // Intentamos descifrar el nombre del alumno
        try {
          if (aluData.nombre) {
            const nombreDescifrado = this.desencriptarTexto(aluData.nombre);
            if (nombreDescifrado) aluData.nombre = nombreDescifrado;
          }
        } catch (e) { /* Nombre no cifrado o error */ }

        return {
          id: d.id,
          ...data,
          alumnos: aluData,
          inventario: invData
        };
      }));

      console.log("Lista final procesada para el Dashboard:", prestamos);
      return prestamos;
    } catch (error) {
      console.error("Error en el servicio de Firebase:", error);
      return [];
    }
  }
  // ==========================================
  // REGISTRO DE PRÉSTAMOS
  // ==========================================
  async registrarNuevoPrestamo(matricula: string, numHerramienta: string, numEmpleado: string) {
    try {
      // 1. Crear el préstamo
      await addDoc(collection(this.firestore, 'prestamos'), {
        matricula_alumno: matricula,
        num_herramienta: numHerramienta,
        num_empleado: numEmpleado,
        estado: 'Activo',
        fecha_salida: new Date().toISOString()
      });

      // 2. Actualizar estado de herramienta
      const toolRef = doc(this.firestore, 'inventario', numHerramienta);
      await updateDoc(toolRef, { estado: 'Prestado' });

      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async registrarDevolucion(idPrestamo: string, numHerramienta: string) {
    try {
      await updateDoc(doc(this.firestore, 'prestamos', idPrestamo), {
        estado: 'Devuelto',
        fecha_devolucion: new Date().toISOString()
      });

      await updateDoc(doc(this.firestore, 'inventario', numHerramienta), {
        estado: 'Disponible'
      });

      return { exito: true };
    } catch (e) {
      return { exito: false };
    }
  }

  // ==========================================
  // ADMINISTRACIÓN (ALTAS)
  // ==========================================
  async registrarAlumno(alumno: any) {
    try {
      // Usamos setDoc para que el ID del documento sea la matrícula
      await setDoc(doc(this.firestore, 'alumnos', alumno.matricula), {
        matricula: alumno.matricula,
        nombre: this.encriptarTexto(alumno.nombre),
        carrera: alumno.carrera,
        grado: alumno.grado
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async obtenerTiposDeHerramientas() {
    const snapshot = await getDocs(collection(this.firestore, 'inventario'));
    const herramientas = snapshot.docs.map(doc => doc.data() as any);
    // Extraemos los tipos, filtramos los que estén vacíos y eliminamos duplicados
    const tipos = herramientas
      .map(h => h.tipo_herramienta)
      .filter((tipo, index, self) => tipo && self.indexOf(tipo) === index);
    return tipos;
  }

  async registrarHerramienta(herramienta: any) {
    try {
      await setDoc(doc(this.firestore, 'inventario', herramienta.codigo), {
        num_herramienta: herramienta.codigo,
        nombre_herramienta: herramienta.nombre,
        tipo_herramienta: herramienta.tipo, // Nuevo campo
        estado: 'Disponible'
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async registrarEmpleado(empleado: any) {
    try {
      await setDoc(doc(this.firestore, 'trabajadores', empleado.numEmpleado), {
        num_empleado: empleado.numEmpleado,
        nombre: this.encriptarTexto(empleado.nombre),
        password: this.hashearPassword(empleado.password),
        rol: empleado.rol
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async obtenerAlumnos() {
    const snapshot = await getDocs(collection(this.firestore, 'alumnos'));
    return snapshot.docs.map(d => {
      const data: any = d.data();
      try {
        data.nombre = this.desencriptarTexto(data.nombre);
      } catch (e) {}
      return { ...data }; // Retornamos los datos del alumno
    });
  }

  // --- MÉTODOS PARA MAESTROS ---
  async registrarMaestro(maestro: any) {
    try {
      // Usamos el número de maestro como ID del documento
      await setDoc(doc(this.firestore, 'maestros', maestro.numMaestro), {
        num_maestro: maestro.numMaestro,
        nombre: this.encriptarTexto(maestro.nombre), // Mantenemos el cifrado de seguridad
        materias: maestro.materias, // Esto será un arreglo de strings
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async obtenerMaestros() {
    try {
      const snapshot = await getDocs(collection(this.firestore, 'maestros'));
      return snapshot.docs.map(d => {
        const data: any = d.data();
        try {
          data.nombre = this.desencriptarTexto(data.nombre);
        } catch (e) {}
        return { id: d.id, ...data };
      });
    } catch (e) {
      return [];
    }
  }

  // ==========================================
  // GESTIÓN (EDITAR / ELIMINAR)
  // ==========================================
  async eliminarRegistro(coleccion: string, id: string) {
    try {
      await deleteDoc(doc(this.firestore, coleccion, id));
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async obtenerEmpleados() {
    const snapshot = await getDocs(collection(this.firestore, 'trabajadores'));
    return snapshot.docs.map(d => {
      const data: any = d.data();
      try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
      return { id: d.id, ...data };
    });
  }
}