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
      // Buscamos solo los que no han sido devueltos
      const q = query(colRef, where('estado', '==', 'Activo'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return [];

      return await Promise.all(snapshot.docs.map(async (d) => {
        const data: any = d.data();
        
        // IMPORTANTE: Verifica que estos IDs existan en sus respectivas colecciones
        const aluSnap = await getDoc(doc(this.firestore, 'alumnos', data.matricula));
        const invSnap = await getDoc(doc(this.firestore, 'inventario', data.herramientaId));
        
        const aluData: any = aluSnap.exists() ? aluSnap.data() : { nombre: 'Alumno no encontrado' };
        const invData: any = invSnap.exists() ? invSnap.data() : { nombre_herramienta: 'Herramienta no encontrada' };

        // Desencriptamos el nombre del alumno si es necesario
        try {
          if (aluData.nombre) {
            aluData.nombre = this.desencriptarTexto(aluData.nombre);
          }
        } catch (e) { console.error("Error al desencriptar"); }

        return { 
          id: d.id, 
          ...data, 
          alumnos: aluData, 
          inventario: invData 
        };
      }));
    } catch (error) {
      console.error("Error en dashboard:", error);
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
        estado: herramienta.estado || 'Disponible' 
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  // ==========================================
  // PRÉSTAMOS Y DEVOLUCIONES
  // ==========================================
  async registrarNuevoPrestamo(
    matricula: string, 
    herramientaId: string, 
    empleadoId: string, 
    profesor?: string, 
    materia?: string
  ) {
    try {
      // 1. Referencia al documento de la herramienta para marcarla como PRESTADA
      const herramientaRef = doc(this.firestore, 'inventario', herramientaId);
      
      // 2. Guardar el registro del préstamo en una nueva colección
      const prestamoRef = collection(this.firestore, 'prestamos');
      await addDoc(prestamoRef, {
        matricula,
        herramientaId,
        empleadoId,
        profesor: profesor || 'Sin asignar',
        materia: materia || 'Sin asignar',
        fecha: new Date(),
        estado: 'Activo'
      });

      // 3. Actualizar el estado de la herramienta en el inventario
      // (Opcional: puedes añadir un campo 'prestada: true')
      await updateDoc(herramientaRef, {
        prestada: true,               // Para validaciones lógicas
        estado: 'Prestado',           // PARA QUE EL PUNTITO CAMBIE A ROJO
        usuario_prestamo: matricula   // Para saber quién la tiene
      });
      
      return { exito: true };
    } catch (e: any) {
      console.error("Error en el servicio:", e);
      return { exito: false, mensaje: e.message };
    }
  }

  async registrarDevolucion(idPrestamo: string, idHerramienta: string) {
    try {
      // 1. Actualizar Préstamo
      await updateDoc(doc(this.firestore, 'prestamos', idPrestamo), {
        estado: 'Devuelto',
        fecha_devolucion: new Date()
      });

      // 2. Liberar Herramienta
      await updateDoc(doc(this.firestore, 'inventario', idHerramienta), {
        estado: 'Disponible',
        prestada: false,
        usuario_prestamo: ""
      });

      return { exito: true };
    } catch (e) {
      return { exito: false };
    }
  }

  async contarPrestamosActivos(matricula: string): Promise<number> {
    try {
      const prestamosRef = collection(this.firestore, 'prestamos');
      // Filtramos por matrícula y que el estado sea 'Activo'
      const q = query(
        prestamosRef, 
        where('matricula', '==', matricula), 
        where('estado', '==', 'Activo')
      );
      const snapshot = await getDocs(q);
      return snapshot.size; // Retorna la cantidad de documentos encontrados
    } catch (error) {
      console.error("Error al contar préstamos:", error);
      return 0;
    }
  }

 // ==========================================
// ALUMNOS
// ==========================================
  async buscarAlumnoPorMatricula(matricula: string) {
    try {
      const q = query(collection(this.firestore, 'alumnos'), where('matricula', '==', matricula));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data: any = querySnapshot.docs[0].data();
        // DESENCRIPTAMOS EL NOMBRE AQUÍ PARA QUE LA VISTA LO RECONOZCA
        try {
          if (data.nombre) {
            data.nombre = this.desencriptarTexto(data.nombre);
          }
        } catch (e) {
          console.error("Error al desencriptar nombre del alumno");
        }
        return data; 
      }
      return null;
    } catch (error) {
      console.error("Error buscando alumno:", error);
      return null;
    }
  }

  // ==========================================
  // MAESTROS Y EMPLEADOS
  // ==========================================
  async obtenerMaestros() {
    try {
      const snapshot = await getDocs(collection(this.firestore, 'maestros'));
      return snapshot.docs.map(d => {
        const data: any = d.data();
        try { 
          if (data.nombre) {
            data.nombre = this.desencriptarTexto(data.nombre); 
          }
        } catch (e) {}
        return { id: d.id, ...data };
      });
    } catch (error) {
      console.error("Error al obtener maestros:", error);
      return [];
    }
  }

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