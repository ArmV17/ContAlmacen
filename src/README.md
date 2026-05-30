# 📦 CAMPS - Control de Almacén y Manejo de Préstamos de Suelos

![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

**CAMPS** es una plataforma integral de gestión de inventario y control de préstamos desarrollada específicamente para el **Departamento de Suelos de la Universidad Autónoma Agraria Antonio Narro (UAAAN)**. 

El sistema optimiza el flujo de trabajo del almacén mediante el rastreo en tiempo real de herramientas, la automatización de notificaciones y la digitalización de procesos mediante tecnología de códigos de barras y QR.

## ✨ Características Principales

- **🔐 Acceso Seguro (Login):** Sistema de autenticación basado en roles (Administrador y Staff).
- **📊 Dashboard Interactivo:** Resumen en tiempo real de préstamos activos, devoluciones pendientes y alertas de stock. Generación de reportes PDF y envío masivo de notificaciones por correo.
- **🛒 Control de Préstamos:** - Escaneo rápido de identificaciones de alumnos/maestros.
  - Soporte para lectura de Códigos QR y Códigos de Barras.
  - Lógica de restricción de préstamos (límite de 5 artículos por alumno).
- **🔄 Devoluciones Ágiles:** Proceso optimizado para recibir material, con opciones para reportar incidencias y enviar herramientas a mantenimiento.
- **🗃️ Inventario Inteligente:** Catálogo digital con indicadores visuales de estado (Glow UI). Clasificación automática (Disponible, Prestado, Mantenimiento).
- **⚙️ Panel de Administración:**
  - Importación masiva de alumnos mediante archivos Excel (`.xlsx`) con prevención de registros duplicados.
  - Generador integrado de etiquetas (Códigos de Barras y QR) listos para impresión.
  - Gestión de usuarios, maestros y catálogo de herramientas.

## 🛠️ Tecnologías y Arquitectura

- **Frontend:** Ionic Framework integrado con Angular (Standalone Components para un rendimiento óptimo).
- **Lenguaje:** TypeScript, HTML5.
- **Estilos:** SCSS con un sistema de diseño propio (Design System 2026), UI Cardless, Glassmorphism y animaciones fluidas (`cubic-bezier`).
- **Backend & Base de Datos:** Integración con servicios en la nube (Supabase / Firebase) para sincronización de datos en tiempo real.
- **Librerías Destacadas:** - `xlsx`: Para la lectura y procesamiento de archivos Excel.
  - `ionicons`: Iconografía nativa.
  - Manipulación de `Canvas API` para la generación dinámica de identificadores gráficos.

## 🚀 Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu entorno de desarrollo:
- [Node.js](https://nodejs.org/) (v18 o superior recomendado)
- [Ionic CLI](https://ionicframework.com/docs/cli) (`npm install -g @ionic/cli`)
- Git

## 💻 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone [https://github.com/tu-usuario/camps-uaaan.git](https://github.com/tu-usuario/camps-uaaan.git)
   cd camps-uaaan
Instalar dependencias:

Bash
npm install
Configurar variables de entorno:
Crea un archivo environments/environment.ts con tus credenciales de base de datos correspondientes (Supabase/Firebase).

Ejecutar en el navegador:

Bash
ionic serve
La aplicación se abrirá por defecto en http://localhost:8100

📱 Despliegue (Build)
Para generar la versión de producción optimizada:

Para Web / PWA:

Bash
ionic build --prod
Para Android (Capacitor):

Bash
npx cap add android
ionic build
npx cap copy android
npx cap open android

👨‍💻 Autor y Desarrollo
Desarrollado como proyecto de tesis de Ingeniería en Gestión y Desarrollo de Software por:

Jose Armando Villa Olvera - Universidad Tecnológica de Coahuila (UTC).

Proyecto implementado para la Universidad Autónoma Agraria Antonio Narro (UAAAN).

**Nota:** Solo recuerda ajustar el enlace de `git clone` en la sección de instalación si