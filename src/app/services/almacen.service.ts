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
  async registrarNuevoPrestamoDetallado(datos: any) {
    try {
      const prestamosRef = collection(this.firestore, 'prestamos');
      
      const nombreHerramientaFull = datos.herramienta.tipo_herramienta 
        ? `${datos.herramienta.nombre_herramienta} (${datos.herramienta.tipo_herramienta})`
        : datos.herramienta.nombre_herramienta;

      const docData = {
        receptor_id: datos.receptor.id,
        receptor_nombre: datos.receptor.nombre,
        receptor_tipo: datos.esProfesor ? 'Profesor' : 'Alumno',
        receptor_info_extra: datos.receptor.info_extra,

        autorizado_por_nombre: datos.autorizador.nombre,
        autorizado_por_id: datos.autorizador.num_empleado,
        // --- AGREGAMOS EL DEPARTAMENTO AL REGISTRO DEL PRÉSTAMO ---
        autorizado_por_depto: datos.autorizador.departamento || 'N/A', 
        materia: datos.materia,
        
        // Usamos el ID del documento de Firestore o el num_herramienta como respaldo
        herramienta_id_db: datos.herramienta.id || datos.herramienta.num_herramienta, 
        herramienta_codigo: datos.herramienta.num_herramienta,
        herramienta_nombre: nombreHerramientaFull,
        
        fecha_prestamo: new Date(),
        fecha_devolucion_pactada: new Date(datos.fechaEntrega),
        
        empleado_almacen: datos.empleadoAlmacen,
        estado: 'Activo'
      };

      await addDoc(prestamosRef, docData);

      // --- CORRECCIÓN EN LA ACTUALIZACIÓN DEL INVENTARIO ---
      // Usamos el código de la herramienta como ID del documento
      const herramientaDocId = datos.herramienta.id || datos.herramienta.num_herramienta;
      const herramientaDoc = doc(this.firestore, 'inventario', herramientaDocId);
      
      await updateDoc(herramientaDoc, {
        prestada: true,
        estado: 'Prestado',
        usuario_prestamo: datos.receptor.id
      });

      return { exito: true };
    } catch (e) {
      console.error("Error crítico en registrarNuevoPrestamoDetallado:", e);
      return { exito: false };
    }
  }

  /**
   * Método auxiliar para contar préstamos (Asegúrate de que use el campo genérico receptor_id)
   */
  async contarPrestamosActivos(identificador: string): Promise<number> {
    try {
      const prestamosRef = collection(this.firestore, 'prestamos');
      const q = query(
        prestamosRef, 
        where('receptor_id', '==', identificador), 
        where('estado', '==', 'Activo')
      );
      const snap = await getDocs(q);
      return snap.size;
    } catch (e) {
      console.error("Error al contar préstamos:", e);
      return 0;
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

  async obtenerTodosLosPrestamosActivos() {
    try {
      const colRef = collection(this.firestore, 'prestamos');
      const q = query(colRef, where('estado', '==', 'Activo'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Error obteniendo todos los préstamos:", e);
      return [];
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
          
          if (data.departamento) {
            try {
              data.departamento = this.desencriptarTexto(data.departamento);
            } catch {
            }
          }
        } catch (e) {
          console.error("Error al procesar datos del maestro:", e);
        }
        
        return { 
          id: d.id, 
          ...data,
          num_maestro: data.num_maestro,
          departamento: data.departamento || 'SIN ÁREA'
        };
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
        materias: maestro.materias,
        // --- AGREGAMOS DEPARTAMENTO ENCRIPTADO ---
        departamento: this.encriptarTexto(maestro.departamento || 'SIN AREA')
      });
      return { exito: true };
    } catch (e: any) {
      return { exito: false, mensaje: e.message };
    }
  }

  async buscarMaestroPorId(id: string) {
    try {
      const docRef = doc(this.firestore, 'maestros', id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data: any = snap.data();
        if (data.nombre) data.nombre = this.desencriptarTexto(data.nombre);
        if (data.departamento) {
          try { data.departamento = this.desencriptarTexto(data.departamento); } catch { }
        }
        return { id: snap.id, ...data };
      }
      return null;
    } catch (e) {
      return null;
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