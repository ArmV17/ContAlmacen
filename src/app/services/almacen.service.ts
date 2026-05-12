import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  constructor(
    private firestore: Firestore,
    private http: HttpClient 
  ) { }
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
      const q = query(colRef, where('estado', '==', 'Activo'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) return [];

      // 1. Obtenemos el momento exacto de este instante
      const ahora = new Date();
      const ahoraMS = ahora.getTime();

      return await Promise.all(snapshot.docs.map(async (d) => {
        const data: any = d.data();
        let aluData = { nombre: data.receptor_nombre || 'Desconocido' };
        let invData = { nombre_herramienta: data.herramienta_nombre || 'Herramienta' };

        // --- Búsqueda de detalles de alumno ---
        try {
          if (data.receptor_id) {
            const aluSnap = await getDoc(doc(this.firestore, 'alumnos', data.receptor_id));
            if (aluSnap.exists()) {
              const tempAlu: any = aluSnap.data();
              try { tempAlu.nombre = this.desencriptarTexto(tempAlu.nombre); } catch (e) { }
              aluData = tempAlu;
            }
          }
        } catch (e) { }

        // --- LÓGICA DE VENCIMIENTO A LAS 3:00 PM ---
        let estadoVisual = data.estado;
        if (data.fecha_devolucion_pactada) {
          const fechaPactada = data.fecha_devolucion_pactada.toDate();
          
          // Creamos la fecha límite: el día pactado a las 15:00:00 (3 PM)
          const fechaLimite = new Date(
            fechaPactada.getFullYear(),
            fechaPactada.getMonth(),
            fechaPactada.getDate(),
            15, 0, 0, 0 // 15:00 horas
          );

          // Si el momento actual ya pasó las 3 PM de ese día -> Vencido
          // Si todavía no son las 3 PM -> Activo
          if (ahoraMS > fechaLimite.getTime()) {
            estadoVisual = 'Vencido';
          } else {
            estadoVisual = 'Activo';
          }
        }

        return { 
          id: d.id, 
          ...data, 
          estado: estadoVisual,
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
      
      // 1. BUSCAR EL CORREO AUTOMÁTICAMENTE EN LA TABLA CORRESPONDIENTE
      let correoFinal = datos.receptor.correo; // Intentamos ver si ya viene

      if (!correoFinal && datos.receptor.id) {
        // Si no viene, lo buscamos en la colección según el tipo
        const coleccionNombre = datos.esProfesor ? 'maestros' : 'alumnos';
        const userDoc = await getDoc(doc(this.firestore, coleccionNombre, datos.receptor.id));
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          correoFinal = userData.correo; // Aquí recuperamos el correo de tu tabla
        }
      }

      // 2. LÓGICA DE FECHA (REGLA DE LAS 3 PM)
      const fechaBase = new Date(datos.fechaEntrega);
      const fechaCorregida = new Date(
        fechaBase.getUTCFullYear(),
        fechaBase.getUTCMonth(),
        fechaBase.getUTCDate(),
        15, 0, 0 // 3:00 PM
      );

      const nombreHerramientaFull = datos.herramienta.tipo_herramienta 
        ? `${datos.herramienta.nombre_herramienta} (${datos.herramienta.tipo_herramienta})`
        : datos.herramienta.nombre_herramienta;

      const docData = {
        receptor_id: datos.receptor.id,
        receptor_nombre: datos.receptor.nombre,
        receptor_correo: correoFinal || 'sin_correo@utc.edu.mx', // Se guarda el correo encontrado
        receptor_tipo: datos.esProfesor ? 'Profesor' : 'Alumno',
        receptor_info_extra: datos.receptor.info_extra || '',
        autorizado_por_nombre: datos.autorizador.nombre,
        autorizado_por_id: datos.autorizador.num_empleado,
        autorizado_por_depto: datos.autorizador.departamento || 'N/A', 
        materia: datos.materia || 'General',
        herramienta_id_db: datos.herramienta.id || datos.herramienta.num_herramienta, 
        herramienta_codigo: datos.herramienta.num_herramienta,
        herramienta_nombre: nombreHerramientaFull,
        fecha_prestamo: new Date(),
        fecha_devolucion_pactada: fechaCorregida,
        empleado_almacen: datos.empleadoAlmacen || 'Admin',
        estado: 'Activo'
      };

      // 3. GUARDAR EN FIREBASE
      await addDoc(prestamosRef, docData);

      // 4. ENVIAR A GOOGLE SHEETS (Ahora sí con correo garantizado)
      const fechaISO = fechaCorregida.toISOString().split('T')[0];
      await this.enviarAlertaGoogle({
        to_email: correoFinal, // <--- Este ya no debería ser undefined
        nombre: docData.receptor_nombre,
        herramienta: docData.herramienta_nombre,
        fecha_entrega: fechaISO 
      });

      // 5. ACTUALIZAR INVENTARIO
      const herramientaDocId = datos.herramienta.id || datos.herramienta.num_herramienta;
      await updateDoc(doc(this.firestore, 'inventario', herramientaDocId), {
        prestada: true,
        estado: 'Prestado',
        usuario_prestamo: datos.receptor.id
      });

      return { exito: true };
    } catch (e) {
      console.error("Error crítico:", e);
      return { exito: false };
    }
  }

  // ==========================================
  // SISTEMA DE ALERTAS MANUALES (GOOGLE SCRIPT)
  // ==========================================
  /**
   * Función para el registro inicial (antes llamada enviarAlertaGoogle)
   * Se usa dentro de registrarNuevoPrestamoDetallado.
   */
  async enviarAlertaRegistroInicial(datos: any) {
    const urlScript = environment.urlGoogleScript; 
    const payload = {
      to_email: datos.to_email,
      nombre: datos.nombre,
      herramienta: datos.herramienta,
      fecha_entrega: datos.fecha_entrega 
    };

    try {
      await fetch(urlScript, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { exito: true };
    } catch (error) {
      console.error("Error al registrar en Google Sheets:", error);
      return { exito: false };
    }
  }

  // ==========================================
  // SISTEMA DE ALERTAS (GOOGLE SCRIPT)
  // ==========================================

  /**
   * Esta es la función que te pide la línea 228
   */
  async enviarAlertaGoogle(datos: any) {
    const urlScript = environment.urlGoogleScript; 
    const payload = {
      to_email: datos.to_email,
      nombre: datos.nombre,
      herramienta: datos.herramienta,
      fecha_entrega: datos.fecha_entrega 
    };

    try {
      // Usamos fetch directo para no pelear con inyecciones de HttpClient
      await fetch(urlScript, {
        method: 'POST',
        mode: 'no-cors', 
        body: JSON.stringify(payload)
      });
      return { exito: true };
    } catch (error) {
      console.error("Error en Alerta Inicial:", error);
      return { exito: false };
    }
  }

  /**
   * Esta es la función que llama el Dashboard manualmente
   */
  async notificarEntregaAGoogle() {
    const url = environment.urlGoogleScript;
    const payload = { accion: "enviar_manual" };

    return await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    });
  }

  async enviarAlertasMasivas(lista: any[]) {
    const url = environment.urlGoogleScript;
    const payload = {
      accion: "enviar_manual", // Coincide con el IF del script
      lista_contactos: lista   // Coincide con contents.lista_contactos
    };

    return await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Importante para Google Scripts
      body: JSON.stringify(payload)
    });
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