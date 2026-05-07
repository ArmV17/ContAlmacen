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
  getDoc
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
  // DASHBOARD & DEVOLUCIONES
  // ==========================================
  async obtenerPrestamosDashboard() {
    try {
      const colRef = collection(this.firestore, 'prestamos');
      const q = query(colRef, where('estado', 'in', ['Activo', 'Vencido']));
      const snapshot = await getDocs(q);

      return await Promise.all(snapshot.docs.map(async (d) => {
        const data: any = d.data();
        const aluSnap = await getDoc(doc(this.firestore, 'alumnos', data['matricula_alumno']));
        const invSnap = await getDoc(doc(this.firestore, 'inventario', data['num_herramienta']));
        
        const aluData: any = aluSnap.exists() ? aluSnap.data() : { nombre: 'No encontrado' };
        const invData: any = invSnap.exists() ? invSnap.data() : { nombre_herramienta: 'No encontrada' };

        try {
          if (aluData.nombre) {
            const desc = this.desencriptarTexto(aluData.nombre);
            if (desc) aluData.nombre = desc;
          }
        } catch (e) {}

        return { id: d.id, ...data, alumnos: aluData, inventario: invData };
      }));
    } catch (error) {
      return [];
    }
  }

  // ==========================================
  // ALUMNOS
  // ==========================================
  async registrarAlumno(alumno: any) {
    try {
      await setDoc(doc(this.firestore, 'alumnos', alumno.matricula), {
        matricula: alumno.matricula,
        nombre: this.encriptarTexto(alumno.nombre),
        carrera: alumno.carrera,
        correo: alumno.correo 
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
      try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
      return { ...data, correo: data.correo || data.nivel || data.grado || 'Sin correo' };
    });
  }

  // ==========================================
  // INVENTARIO e ILUSTRACIONES
  // ==========================================
  async obtenerInventario() {
    const colRef = collection(this.firestore, 'inventario');
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async obtenerTiposDeHerramientas() {
    try {
      const snapshot = await getDocs(collection(this.firestore, 'inventario'));
      const herramientas = snapshot.docs.map(doc => doc.data() as any);
      return [...new Set(herramientas.map(h => h.tipo_herramienta).filter(t => t))];
    } catch (e) {
      return [];
    }
  }

  async registrarHerramienta(herramienta: any) {
    try {
      await setDoc(doc(this.firestore, 'inventario', herramienta.codigo), {
        num_herramienta: herramienta.codigo,
        nombre_herramienta: herramienta.nombre,
        tipo_herramienta: herramienta.tipo,
        estado: 'Disponible'
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  // ==========================================
  // PRÉSTAMOS Y DEVOLUCIONES
  // ==========================================
  async registrarNuevoPrestamo(matricula: string, numHerramienta: string, numEmpleado: string) {
    try {
      await addDoc(collection(this.firestore, 'prestamos'), {
        matricula_alumno: matricula,
        num_herramienta: numHerramienta,
        num_empleado: numEmpleado,
        estado: 'Activo',
        fecha_salida: new Date().toISOString()
      });

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
  // MAESTROS Y EMPLEADOS
  // ==========================================
  async registrarMaestro(maestro: any) {
    try {
      await setDoc(doc(this.firestore, 'maestros', maestro.numMaestro), {
        num_maestro: maestro.numMaestro,
        nombre: this.encriptarTexto(maestro.nombre),
        correo: maestro.correo,
        materias: maestro.materias
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async obtenerMaestros() {
    const snapshot = await getDocs(collection(this.firestore, 'maestros'));
    return snapshot.docs.map(d => {
      const data: any = d.data();
      try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
      return { id: d.id, ...data };
    });
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

  async obtenerEmpleados() {
    const snapshot = await getDocs(collection(this.firestore, 'trabajadores'));
    return snapshot.docs.map(d => {
      const data: any = d.data();
      try { data.nombre = this.desencriptarTexto(data.nombre); } catch (e) {}
      return { id: d.id, ...data };
    });
  }

  // ==========================================
  // GESTIÓN GENERAL
  // ==========================================
  async eliminarRegistro(coleccion: string, id: string) {
    try {
      await deleteDoc(doc(this.firestore, coleccion, id));
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }
}