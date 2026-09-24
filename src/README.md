# 📦 CAMPS - Control de Almacén y Manejo de Préstamos de Suelos

![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**CAMPS** es una plataforma integral de gestión de inventario y control de préstamos desarrollada específicamente para el **Departamento de Suelos de la Universidad Autónoma Agraria Antonio Narro (UAAAN)**. 

El sistema optimiza el flujo de trabajo del almacén mediante el rastreo en tiempo real de herramientas, la automatización de notificaciones y la digitalización de procesos mediante tecnología de códigos de barras y QR.

## ✨ Características Principales

- **🔐 Acceso Seguro (Login):** Sistema de autenticación basado en roles (Administrador y Staff) con cierre de sesión automático por inactividad.
- **📊 Dashboard Interactivo:** Resumen en tiempo real de préstamos activos, devoluciones pendientes y alertas de stock. Generación de reportes PDF.
- **🛒 Control de Préstamos:** 
  - Escaneo rápido de identificaciones de alumnos/maestros (Auto-focus).
  - Soporte para lectura de Códigos QR y Códigos de Barras (Code128).
  - Lógica de restricción algorítmica de préstamos (límite de 5 artículos por alumno).
- **🔄 Devoluciones Ágiles:** Proceso optimizado para recibir material en ráfaga con el escáner.
- **🗃️ Inventario Inteligente:** Catálogo digital con indicadores visuales de estado (Glow UI). Clasificación automática (Verde = Disponible, Rojo = Prestado, Amarillo = Mantenimiento).
- **⚙️ Panel de Administración:**
  - Importación masiva de alumnos mediante archivos Excel (`.xlsx`) con sanitización automática y prevención de registros duplicados.
  - Generador integrado de etiquetas (Canvas API) listos para impresión.
  - Gestión de usuarios, maestros y catálogo de herramientas.

## 🛠️ Tecnologías y Arquitectura

- **Frontend:** Ionic Framework integrado con Angular (Standalone Components para un rendimiento óptimo).
- **Lenguaje:** TypeScript, HTML5.
- **Estilos:** SCSS con un sistema de diseño propio (Design System 2026), UI Cardless, Glassmorphism y paleta institucional "Slate Navy".
- **Backend & Base de Datos:** Integración con Firebase (Cloud Firestore y Authentication) para sincronización de datos en tiempo real y arquitectura Serverless.
- **Librerías Destacadas:** 
  - `xlsx`: Para la lectura y procesamiento masivo de archivos Excel.
  - `jsbarcode`: Para la generación algorítmica de etiquetas.
  - `ionicons`: Iconografía nativa.

## 🚀 Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu entorno de desarrollo antes de clonar el proyecto:
- [Node.js](https://nodejs.org/) (Versión LTS de 64 bits recomendada)
- Git

## 💻 Instalación y Ejecución Local (Guía a prueba de fallos)

Sigue estos pasos en orden para levantar el proyecto en una computadora nueva sin errores de dependencias.

**1. Clonar el repositorio:**
```bash
git clone https://github.com/ArmV17/ContAlmacen.git
cd camps-uaaan
```

**2. Instalar herramientas globales (Angular y Ionic CLI):**
Abre tu terminal (En Windows, de preferencia ejecuta PowerShell como Administrador) y ejecuta:
```bash
npm install -g @angular/cli
npm install -g @ionic/cli
```

**3. Instalar dependencias locales del proyecto:**
Para evitar que Node.js se quede sin memoria (error `JavaScript heap out of memory`) durante la instalación de las librerías, aumenta la memoria temporal y luego instala:
```bash
set NODE_OPTIONS=--max_old_space_size=4096
npm install
```

**4. Configurar variables de entorno:**
Crea un archivo en la ruta `src/environments/environment.ts` con tus credenciales de base de datos correspondientes (Firebase).

**5. Ejecutar el servidor local:**
Una vez instaladas las dependencias, enciende la aplicación:
```bash
ionic serve
```
La aplicación se compilará y abrirá automáticamente en tu navegador en `http://localhost:8100`.

*💡 **Solución de problemas en Windows:** Si al ejecutar `ionic serve` recibes un error rojo sobre la ejecución de scripts deshabilitada, abre PowerShell como Administrador y ejecuta: `Set-ExecutionPolicy Unrestricted`.*

## 📱 Despliegue (Build)

El proyecto está optimizado para despliegue continuo (CI/CD) en plataformas como **Vercel**.
Para generar la versión de producción optimizada manualmente:

**Para Web / PWA:**
```bash
ionic build --prod
```

**Para Android (Capacitor):**
```bash
npx cap add android
ionic build
npx cap copy android
npx cap open android
```

## 👨‍💻 Autor y Desarrollo

Desarrollado como proyecto de tesis de Ingeniería en Gestión y Desarrollo de Software por:

**Jose Armando Villa Olvera** - Universidad Tecnológica de Coahuila (UTC).

*Proyecto implementado en campo para el beneficio operativo de la Universidad Autónoma Agraria Antonio Narro (UAAAN).*