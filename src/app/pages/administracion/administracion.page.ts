import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';

// 👇 IMPORTACIÓN MASIVA DE COMPONENTES STANDALONE PARA EVITAR QUE VERCEL LOS BORRE
import { 
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
  IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonContent, 
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, 
  IonInput, IonChip, IonIcon, IonButton, IonNote, IonList, 
  IonBadge, IonSelect, IonSelectOption, ToastController, AlertController,
  LoadingController
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { 
  menu, personAddOutline, buildOutline, idCardOutline, 
  saveOutline, trashOutline, createOutline, addCircleOutline, 
  closeCircle, qrCodeOutline, barcodeOutline, informationCircleOutline, 
  helpCircleOutline, lockClosedOutline, peopleCircleOutline, hammer, 
  checkmarkCircleOutline, checkmarkCircle, closeCircleOutline,
  gridOutline
} from 'ionicons/icons';

import { AlmacenService } from '../../services/almacen.service';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.page.html',
  styleUrls: ['./administracion.page.scss'],
  standalone: true,
  // 👇 DECLARACIÓN EXPLÍCITA DE COMPONENTES
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, 
    IonSegment, IonSegmentButton, IonLabel, IonSearchbar, IonContent, 
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, 
    IonInput, IonChip, IonIcon, IonButton, IonNote, IonList, 
    IonBadge, IonSelect, IonSelectOption
  ]
})
export class AdministracionPage {

  esSuperAdmin: boolean = false;
  segmentoActual: string = 'alumnos';
  textoBuscar: string = '';

  editandoAlumno: boolean = false;
  editandoMaestro: boolean = false;
  editandoHerramienta: boolean = false;
  editandoEmpleado: boolean = false;
  
  alumnos: any[] = [];
  herramientas: any[] = [];
  empleados: any[] = [];
  maestros: any[] = [];
  tiposExistentes: string[] = [];
  listaDepartamentos: string[] = [];
  departamentosFiltrados: string[] = [];
  carrerasExistentes: string[] = []; 
  carrerasFiltradas: string[] = [];

  nombresFiltrados: string[] = []; 
  tiposFiltrados: string[] = [];

  alumnoNuevo = { matricula: '', nombre: '', carrera: '', correo: '' };
  empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
  herramientaNueva = { codigo: '', nombre: '', tipo: '', cantidad: 1, estado: 'Disponible' };

  maestroNuevo = { numMaestro: '', nombre: '', correo: '', materias: [] as string[], departamento: ''};
  materiaTemp: string = ''; 

  constructor(
    private almacenService: AlmacenService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    addIcons({ 
      menu, personAddOutline, buildOutline, idCardOutline, 
      saveOutline, trashOutline, createOutline, addCircleOutline, 
      closeCircle, qrCodeOutline, barcodeOutline, informationCircleOutline, 
      helpCircleOutline, lockClosedOutline, peopleCircleOutline, 
      hammer, checkmarkCircleOutline, checkmarkCircle, closeCircleOutline,
      gridOutline
    });
  }

  async ionViewWillEnter() {
    const nombreGuardado = localStorage.getItem('userName');
    const rolGuardado = localStorage.getItem('userRol');
    this.esSuperAdmin = (rolGuardado === 'Admin' && nombreGuardado === 'Admin D.suelos');
    this.cargarDatos();
  }

  async cargarDatos() {
    this.alumnos = await this.almacenService.obtenerAlumnos();
    this.herramientas = await this.almacenService.obtenerInventario();
    this.tiposExistentes = await this.almacenService.obtenerTiposDeHerramientas();
    this.maestros = await this.almacenService.obtenerMaestros();
    this.actualizarCatalogoCarreras(this.alumnos);
    if (this.esSuperAdmin) {
      this.empleados = await this.almacenService.obtenerEmpleados();
    } else {
      this.empleados = [];
    }
    this.obtenerDepartamentosUnicos();
  }

  async alSeleccionarArchivoExcel(event: any) {
    const archivo = event.target.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const filas: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

      const alumnosNuevos: any[] = [];
      let duplicados = 0;

      for (let fila of filas) {
        const matricula = (fila['Matricula'] || fila['MATRICULA'] || '').toString().trim();
        
        // Verificamos si ya existe en el array local
        const existe = this.alumnos.find(a => a.matricula === matricula);
        
        if (!existe && matricula) {
          alumnosNuevos.push({
            matricula: matricula,
            nombre: this.formatearNombrePropio(fila['Nombre'] || fila['NOMBRE'] || ''),
            carrera: this.formatearNombrePropio(fila['Carrera'] || 'No especificada'),
            correo: (fila['Correo'] || fila['CORREO'] || 'sin_correo@gmail.com').trim()
          });
        } else {
          duplicados++;
        }
      }

      if (alumnosNuevos.length > 0) {
        const resultado = await this.almacenService.cargarAlumnosMasivo(alumnosNuevos);
        this.mostrarMensaje(`Registrados: ${resultado.exitosos}. Duplicados ignorados: ${duplicados}`, 'success');
        this.cargarDatos();
      } else {
        this.mostrarMensaje(`No se subió nada. ${duplicados} registros ya existían.`, 'warning');
      }
    };
    reader.readAsArrayBuffer(archivo);
  }

  obtenerDepartamentosUnicos() {
    const deps = this.maestros
      .map(m => m.departamento)
      .filter(d => d && d.trim() !== '');
    
    this.listaDepartamentos = [...new Set(deps)].sort() as string[];
  }

  formatearDepartamento(event: any) {
    const valor = event.target.value;
    if (valor) {
      this.maestroNuevo.departamento = valor.toUpperCase();
    }
  }

  actualizarSugerenciasDepartamento() {
    const busqueda = this.maestroNuevo.departamento?.toLowerCase().trim() || '';

    if (!busqueda) {
      this.departamentosFiltrados = [];
      return;
    }

    this.departamentosFiltrados = this.listaDepartamentos.filter(d => 
      d.toLowerCase().includes(busqueda) && d.toLowerCase() !== busqueda
    ).slice(0, 4);
  }

  seleccionarSugerenciaDepartamento(depto: string) {
    this.maestroNuevo.departamento = depto.toUpperCase(); 
    this.departamentosFiltrados = []; 
  }

  validarCorreo(email: string): boolean {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return pattern.test(email);
  }

  // --- LÓGICA DE SUGERENCIAS ---
  
  actualizarSugerenciasNombre() {
    const texto = this.herramientaNueva.nombre?.trim().toLowerCase() || '';
    if (texto === '') {
      this.nombresFiltrados = [];
      return;
    }
    const nombresUnicos = [...new Set(this.herramientas.map(h => h.nombre_herramienta))];
    this.nombresFiltrados = nombresUnicos.filter(n => n.toLowerCase().includes(texto));
  }

  actualizarSugerenciasTipo() {
    const nombreEscrito = this.herramientaNueva.nombre?.trim().toLowerCase() || '';
    if (nombreEscrito === '') {
      this.tiposFiltrados = [];
      return;
    }
    
    const coincidencias = this.herramientas.filter(h => 
      h.nombre_herramienta?.trim().toLowerCase() === nombreEscrito
    );
    
    const tiposLimpias = coincidencias
      .map(h => h.tipo_herramienta?.trim())
      .filter(t => t && t !== '');

    this.tiposFiltrados = [...new Set(tiposLimpias)] as string[];
  }

  seleccionarSugerenciaNombre(nombre: string) {
    this.herramientaNueva.nombre = nombre;
    this.nombresFiltrados = [];
    this.generarCodigoAutomatico();
    this.actualizarSugerenciasTipo();
  }

  seleccionarSugerenciaTipo(tipo: string) {
    this.herramientaNueva.tipo = tipo;
    this.tiposFiltrados = []; 
  }

  actualizarCatalogoCarreras(alumnos: any[]) {
    const carrerasLimpias = alumnos
      .map(a => a.carrera ? a.carrera.trim() : '')
      .filter(c => c !== '');
    
    this.carrerasExistentes = [...new Set(carrerasLimpias)].sort() as string[];
  }

  actualizarSugerenciasCarrera() {
    const busqueda = this.alumnoNuevo.carrera?.toLowerCase().trim() || '';
    
    if (!busqueda) {
      this.carrerasFiltradas = [];
      return;
    }

    this.carrerasFiltradas = this.carrerasExistentes.filter(c => 
      c.toLowerCase().includes(busqueda) && c.toLowerCase() !== busqueda
    ).slice(0, 4); 
  }

  seleccionarSugerenciaCarrera(carrera: string) {
    this.alumnoNuevo.carrera = carrera;
    this.carrerasFiltradas = []; 
  }

  async cargarDepartamentosDinamicos() {
    try {
      const maestros = await this.almacenService.obtenerMaestros();
      const deptos = maestros.map((m: any) => m.departamento).filter((d: string) => d && d !== 'SIN ÁREA');
      this.listaDepartamentos = [...new Set(deptos)] as string[];
    } catch (error) {
      console.error("Error al poblar el datalist de departamentos:", error);
    }
  }

  get listaFiltrada() {
    const t = this.textoBuscar.toLowerCase().trim();
    if (this.segmentoActual === 'alumnos') return this.alumnos.filter(a => a.nombre.toLowerCase().includes(t) || a.matricula.includes(t));
    if (this.segmentoActual === 'maestros') return this.maestros.filter(m => m.nombre.toLowerCase().includes(t) || m.num_maestro.includes(t));
    if (this.segmentoActual === 'herramientas') return this.herramientas.filter(h => h.nombre_herramienta.toLowerCase().includes(t) || h.num_herramienta.includes(t));
    if (this.segmentoActual === 'empleados') return this.empleados.filter(e => e.nombre.toLowerCase().includes(t) || e.num_empleado.includes(t));
    return [];
  }

  // --- FUNCIÓN DE APOYO PARA LIMPIEZA DE TEXTO ---
  private formatearTexto(texto: string): string {
    if (!texto) return '';
    const limpio = texto.trim().toLowerCase();
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
  }

  // --- GESTIÓN DE HERRAMIENTAS (REGISTRO MASIVO) ---
  generarCodigoAutomatico() {
    const nombre = this.herramientaNueva.nombre.trim();
    if (nombre.length < 3) {
      this.herramientaNueva.codigo = '';
      return;
    }

    const prefijo = nombre.substring(0, 3).toUpperCase();
    const coincidencias = this.herramientas.filter(h => 
      h.num_herramienta.startsWith(prefijo)
    );

    const siguienteNumero = (coincidencias.length + 1).toString().padStart(2, '0');
    this.herramientaNueva.codigo = `${prefijo}-${siguienteNumero}`;
  }

  async guardarHerramienta() {
    if (!this.herramientaNueva.nombre || (!this.editandoHerramienta && this.herramientaNueva.cantidad < 1)) {
      this.mostrarMensaje('Nombre y cantidad válida son requeridos', 'warning');
      return;
    }

    const nombreLimpio = this.formatearTexto(this.herramientaNueva.nombre);
    const tipoLimpio = this.formatearTexto(this.herramientaNueva.tipo);

    if (this.editandoHerramienta) {
      const res = await this.almacenService.registrarHerramienta({
        codigo: this.herramientaNueva.codigo,
        nombre: nombreLimpio,
        tipo: tipoLimpio
      });

      if (res.exito) {
        this.mostrarMensaje('Herramienta actualizada con éxito', 'success');
      } else {
        this.mostrarMensaje('Error al actualizar', 'danger');
      }

    } else {
      const totalAInsertar = this.herramientaNueva.cantidad;
      let insertados = 0;

      for (let i = 0; i < totalAInsertar; i++) {
        this.generarCodigoAutomatico(); 

        const dataParaFirebase = {
          codigo: this.herramientaNueva.codigo, 
          nombre: nombreLimpio,               
          tipo: tipoLimpio 
        };

        const res = await this.almacenService.registrarHerramienta(dataParaFirebase);
        
        if (res.exito) {
          insertados++;
          this.herramientas.push({
            nombre_herramienta: dataParaFirebase.nombre,
            num_herramienta: dataParaFirebase.codigo,
            tipo_herramienta: dataParaFirebase.tipo
          });
        }
      }
      this.mostrarMensaje(`Se registraron ${insertados} piezas correctamente`, 'success');
    }

    this.forzarInputTipo = false; 
    this.cancelarEdicionHerramienta();
    await this.cargarDatos();
  }

  prepararEdicionHerramienta(h: any) {
    this.herramientaNueva = { 
      codigo: h.num_herramienta, 
      nombre: h.nombre_herramienta, 
      tipo: h.tipo_herramienta,
      estado: h.estado || 'Disponible',
      cantidad: 1 
    } as any;
    this.editandoHerramienta = true;
    window.scrollTo(0, 0);
  }

  forzarInputTipo: boolean = false;

  checarNuevoTipo(event: any) {
    if (event.detail.value === 'NUEVO_TIPO') {
      this.herramientaNueva.tipo = '';
      this.forzarInputTipo = true;
    }
  }
  
  cancelarEdicionHerramienta() {
    this.herramientaNueva = { 
      codigo: '', 
      nombre: '', 
      tipo: '', 
      cantidad: 1, 
      estado: 'Disponible' 
    } as any;

    this.editandoHerramienta = false;
    this.nombresFiltrados = [];
    this.tiposFiltrados = [];
    this.forzarInputTipo = false;
  }

  async cambiarEstadoMantenimiento(nuevoEstado: string) {
    const dataActualizada = {
      codigo: this.herramientaNueva.codigo,
      nombre: this.herramientaNueva.nombre,
      tipo: this.herramientaNueva.tipo,
      estado: nuevoEstado
    };

    const res = await this.almacenService.registrarHerramienta(dataActualizada);
    if (res.exito) {
      this.mostrarMensaje(`Estado actualizado: ${nuevoEstado}`, 'success');
      this.cancelarEdicionHerramienta();
      await this.cargarDatos(); 
    } else {
      this.mostrarMensaje('Error al actualizar estado', 'danger');
    }
  }

  async toggleMantenimiento(h: any) {
    const nuevoEstado = (h.estado === 'Mantenimiento') ? 'Disponible' : 'Mantenimiento';

    const dataActualizada = {
      codigo: h.num_herramienta, 
      nombre: h.nombre_herramienta,
      tipo: h.tipo_herramienta || '',
      estado: nuevoEstado
    };

    try {
      const res = await this.almacenService.registrarHerramienta(dataActualizada);
      if (res.exito) {
        h.estado = nuevoEstado;
        this.mostrarMensaje(`Estado de ${h.num_herramienta} actualizado a ${nuevoEstado}`, 'success');
      } else {
        this.mostrarMensaje('No se pudo actualizar en Firebase', 'danger');
      }
    } catch (error) {
      console.error("Error al conectar con Firebase:", error);
    }
  }

  // --- DESCARGAR CÓDIGO DE BARRAS ---
  async descargarBarraDirecto(herramienta: any) {
    const codigo = herramienta.num_herramienta;
    const nombre = herramienta.nombre_herramienta;
    const tipo = herramienta.tipo_herramienta;
    
    const nombreFormateado = tipo ? `${nombre} ${tipo} ${codigo}` : `${nombre} ${codigo}`;
    
    const barraUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(codigo)}&scale=4&height=10&backgroundcolor=ffffff`;
    
    const dominio = window.location.origin;
    const logoUrl = `${dominio}/assets/icon/Logo.png`;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el contexto');

      canvas.width = 450;
      canvas.height = 240;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cargarImagen = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; 
          img.onload = () => resolve(img);
          img.onerror = () => reject();
          img.src = src;
        });
      };

      const [imgBarra, imgLogo] = await Promise.all([
        cargarImagen(barraUrl),
        cargarImagen(logoUrl).catch(() => null) 
      ]);

      const inicioYTexto = 25;
      const tamanoLogo = 70;
      const margenIzquierdo = 40;

      if (imgLogo) {
        ctx.drawImage(imgLogo, margenIzquierdo, inicioYTexto, tamanoLogo, tamanoLogo);
      }

      const inicioXTexto = imgLogo ? (margenIzquierdo + tamanoLogo + 20) : margenIzquierdo;
      ctx.textAlign = 'left';

      const textoDepto = `Depto: Suelos`;
      const textoHerramienta = tipo ? `${nombre} (${tipo})` : `${nombre}`;
      const textoID = `ID: ${codigo}`;

      ctx.fillStyle = '#1e293b'; 
      ctx.font = 'bold 18px Arial'; 

      ctx.fillText(textoDepto, inicioXTexto, inicioYTexto + 20);
      ctx.fillText(textoHerramienta, inicioXTexto, inicioYTexto + 45);
      ctx.fillText(textoID, inicioXTexto, inicioYTexto + 70);


      const maxAnchoBarra = canvas.width - 60; 
      
      let barraWidth = imgBarra.width;
      let barraHeight = imgBarra.height;

      if (barraWidth > maxAnchoBarra) {
        const proporcion = maxAnchoBarra / barraWidth;
        barraWidth = maxAnchoBarra;
        barraHeight = barraHeight * proporcion;
      }

      const posXBarra = (canvas.width - barraWidth) / 2;
      const posYBarra = inicioYTexto + tamanoLogo + 35; 

      ctx.drawImage(imgBarra, posXBarra, posYBarra, barraWidth, barraHeight);

      // --- DESCARGA ---
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Barra_${nombreFormateado}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.mostrarMensaje(`Etiqueta de Barra generada: ${nombreFormateado}`, 'success');
      }, 'image/png');

    } catch (error) {
      console.error('Error al componer el diseño de la etiqueta:', error);
      window.open(barraUrl, '_blank');
    }
  }

  // --- DESCARGAR QR ---
  async descargarQRDirecto(herramienta: any) {
    const codigo = herramienta.num_herramienta;
    const nombre = herramienta.nombre_herramienta;
    const tipo = herramienta.tipo_herramienta;
    
    const nombreFormateado = tipo ? `${nombre} ${tipo} ${codigo}` : `${nombre} ${codigo}`;
    
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(codigo)}&size=300&ecLevel=H`;
    const dominio = window.location.origin;
    const logoUrl = `${dominio}/assets/icon/Logo.png`;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el contexto del lienzo');

      canvas.width = 360;
      canvas.height = 460;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cargarImagen = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous'; 
          img.onload = () => resolve(img);
          img.onerror = () => reject();
          img.src = src;
        });
      };

      const [imgQR, imgLogo] = await Promise.all([
        cargarImagen(qrUrl),
        cargarImagen(logoUrl).catch(() => null) 
      ]);

      ctx.drawImage(imgQR, 30, 20, 300, 300);

      const textoDepto = `Depto: Suelos`;
      const textoHerramienta = tipo ? `${nombre} (${tipo})` : `${nombre}`;
      const textoID = `ID: ${codigo}`;

      ctx.font = 'bold 18px Arial'; 
      const anchoTextoDepto = ctx.measureText(textoDepto).width;
      const anchoTextoNombre = ctx.measureText(textoHerramienta).width;
      const anchoTextoID = ctx.measureText(textoID).width;
      
      const maxAnchoTexto = Math.max(anchoTextoNombre, anchoTextoDepto, anchoTextoID);

      const tamanoLogo = 70;
      const separacion = 15; 
      const inicioY = 345;   

      const anchoTotalBloque = imgLogo ? (tamanoLogo + separacion + maxAnchoTexto) : maxAnchoTexto;
      const inicioXBloque = (canvas.width - anchoTotalBloque) / 2;

      if (imgLogo) {
        ctx.drawImage(imgLogo, inicioXBloque, inicioY, tamanoLogo, tamanoLogo);
      }

      const inicioXTexto = imgLogo ? (inicioXBloque + tamanoLogo + separacion) : inicioXBloque;
      ctx.textAlign = 'left';
      
      ctx.fillStyle = '#1e293b'; 
      ctx.font = 'bold 18px Arial'; 

      ctx.fillText(textoDepto, inicioXTexto, inicioY + 20);
      ctx.fillText(textoHerramienta, inicioXTexto, inicioY + 45);
      ctx.fillText(textoID, inicioXTexto, inicioY + 70);

      // Guardar y descargar
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nombreFormateado}.png`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.mostrarMensaje(`Etiqueta QR generada: ${nombreFormateado}`, 'success');
      }, 'image/png');

    } catch (error) {
      console.error('Error al componer el diseño de la etiqueta:', error);
      window.open(qrUrl, '_blank');
    }
  }

  // --- GESTIÓN DE ALUMNOS ---
  async guardarAlumno() {
    const { matricula, nombre, carrera, correo } = this.alumnoNuevo;

    // 1. Validaciones básicas
    if (!matricula || !nombre || !carrera || !correo) {
      this.mostrarMensaje('Por favor, llena todos los campos', 'warning');
      return;
    }

    if (!this.validarCorreo(correo)) {
      this.mostrarMensaje('El formato del correo no es válido', 'danger');
      return;
    }

    // 2. VERIFICACIÓN DE DUPLICADOS (Solo si NO estamos editando)
    if (!this.editandoAlumno) {
      const matriculaLimpia = matricula.trim();
      const existe = this.alumnos.find(a => a.matricula.trim() === matriculaLimpia);
      
      if (existe) {
        this.mostrarMensaje(`Error: El alumno con matrícula ${matriculaLimpia} ya existe.`, 'danger');
        return;
      }
    }

    // 3. Procesamiento y Guardado
    this.alumnoNuevo.nombre = this.formatearNombrePropio(nombre);
    this.alumnoNuevo.carrera = this.formatearNombrePropio(carrera);

    const res = await this.almacenService.registrarAlumno(this.alumnoNuevo);
    
    if (res.exito) {
      this.mostrarMensaje(this.editandoAlumno ? 'Alumno actualizado' : 'Alumno registrado', 'success');
      this.cancelarEdicionAlumno();
      this.cargarDatos(); // Recargamos para refrescar la lista
    } else {
      this.mostrarMensaje('Error al procesar la solicitud', 'danger');
    }
  }

  prepararEdicionAlumno(alumno: any) {
    this.alumnoNuevo = { 
      matricula: alumno.matricula,
      nombre: alumno.nombre,
      carrera: alumno.carrera,
      correo: alumno.correo || alumno.nivel || alumno.grado || '' 
    };
    this.editandoAlumno = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionAlumno() {
    this.alumnoNuevo = { matricula: '', nombre: '', carrera: '', correo: '' };
    this.editandoAlumno = false;
    this.carrerasFiltradas = []; 
  }

  // --- GESTIÓN DE MAESTROS ---
  agregarMateriaLista() {
    if (this.materiaTemp.trim().length > 0) {
      this.maestroNuevo.materias.push(this.materiaTemp.trim());
      this.materiaTemp = ''; 
    }
  }

  quitarMateria(index: number) {
    this.maestroNuevo.materias.splice(index, 1);
  }

  async guardarMaestro() {
    const { numMaestro, nombre, correo, departamento } = this.maestroNuevo;

    // 1. Validación de campos vacíos
    if (!numMaestro || !nombre || !correo || !departamento) {
      this.mostrarMensaje('Nombre, Número, Correo y Departamento son obligatorios', 'warning');
      return;
    }

    // 2. Validación de correo
    if (!this.validarCorreo(correo)) {
      this.mostrarMensaje('El correo del maestro no es válido', 'danger');
      return;
    }

    // 3. VERIFICACIÓN DE DUPLICADOS (Solo para registros nuevos)
    if (!this.editandoMaestro) {
      const existe = this.maestros.find(m => m.num_maestro === numMaestro.trim());
      if (existe) {
        this.mostrarMensaje(`Error: El maestro con número ${numMaestro} ya existe.`, 'danger');
        return;
      }
    }

    // 4. Formateo de datos
    this.maestroNuevo.nombre = this.formatearNombrePropio(nombre);
    this.maestroNuevo.departamento = departamento.toUpperCase().trim();
    this.maestroNuevo.materias = this.maestroNuevo.materias.map(m => this.formatearNombrePropio(m));

    if (this.maestroNuevo.materias.length === 0 && this.materiaTemp.trim() !== '') {
      this.agregarMateriaLista();
    }
    
    // 5. Guardado en servicio
    const res = await this.almacenService.registrarMaestro(this.maestroNuevo);
    
    if (res.exito) {
      this.mostrarMensaje(this.editandoMaestro ? 'Maestro actualizado' : 'Maestro registrado', 'success');
      this.cancelarEdicionMaestro();
      this.cargarDatos(); // Refrescamos lista
    } else {
      this.mostrarMensaje('Error al guardar maestro', 'danger');
    }
  }

  prepararEdicionMaestro(m: any) {
    this.maestroNuevo = { 
        numMaestro: m.num_maestro, 
        nombre: m.nombre, 
        correo: m.correo || '',
        materias: [...m.materias],
        departamento: m.departamento || ''
    };
    this.editandoMaestro = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionMaestro() {
    this.maestroNuevo = { numMaestro: '', nombre: '', correo: '', materias: [], departamento: '' };
    this.materiaTemp = '';
    this.editandoMaestro = false;
    this.departamentosFiltrados = [];
  }

  async guardarEmpleado() {
    // 1. Validación de campos obligatorios
    if(!this.empleadoNuevo.numEmpleado || !this.empleadoNuevo.nombre || (!this.editandoEmpleado && !this.empleadoNuevo.password)){
        this.mostrarMensaje('Todos los campos son obligatorios', 'warning');
        return;
    }

    // 2. VERIFICACIÓN DE DUPLICADOS (Solo si es un registro nuevo)
    if (!this.editandoEmpleado) {
      const numLimpio = this.empleadoNuevo.numEmpleado.trim();
      const existe = this.empleados.find(e => e.num_empleado === numLimpio);
      
      if (existe) {
        this.mostrarMensaje(`Error: El número de empleado ${numLimpio} ya está registrado.`, 'danger');
        return;
      }
    }

    // 3. Formateo y guardado
    this.empleadoNuevo.nombre = this.formatearNombrePropio(this.empleadoNuevo.nombre);

    const res = await this.almacenService.registrarEmpleado(this.empleadoNuevo);
    
    if (res.exito) {
      this.mostrarMensaje(this.editandoEmpleado ? 'Empleado actualizado' : 'Empleado registrado', 'success');
      this.cancelarEdicionEmpleado();
      this.cargarDatos(); // Refrescamos lista
    } else {
      this.mostrarMensaje('Error al guardar', 'danger');
    }
  }

  prepararEdicionEmpleado(e: any) {
    this.empleadoNuevo = { numEmpleado: e.num_empleado, nombre: e.nombre, password: '', rol: e.rol };
    this.editandoEmpleado = true;
    window.scrollTo(0, 0);
  }

  cancelarEdicionEmpleado() {
    this.empleadoNuevo = { numEmpleado: '', nombre: '', password: '', rol: 'Staff' };
    this.editandoEmpleado = false;
  }

  async confirmarEliminar(tabla: string, idVal: string, nombre: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      // 🚀 CORREGIDO: Sin etiquetas HTML intermedias
      message: `¿Estás seguro de eliminar a ${nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Eliminar', 
          cssClass: 'boton-alerta-eliminar',
          handler: async () => {
            const res = await this.almacenService.eliminarRegistro(tabla, idVal);
            if (res.exito) {
              if (this.segmentoActual === 'alumnos') this.alumnos = this.alumnos.filter(a => a.matricula !== idVal);
              else if (this.segmentoActual === 'maestros') this.maestros = this.maestros.filter(m => m.num_maestro !== idVal);
              else if (this.segmentoActual === 'herramientas') this.herramientas = this.herramientas.filter(h => h.num_herramienta !== idVal);
              else if (this.segmentoActual === 'empleados') this.empleados = this.empleados.filter(e => e.num_empleado !== idVal);

              this.mostrarMensaje('Registro eliminado con éxito', 'success');
            } else this.mostrarMensaje('Error: registro vinculado a un préstamo', 'danger');
          }
        }
      ]
    });
    await alert.present();
  }

  async mostrarMensaje(m: string, c: string) {
    const t = await this.toastController.create({ 
      message: m, 
      duration: 2000, 
      color: c, 
      position: 'bottom' 
    });
    t.present();
  }

  formatearNombrePropio(texto: string): string {
    if (!texto) return '';
    return texto
      .trim()
      .toLowerCase()
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }
}