import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http'; 

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

// 👇 1. CHIVATOS PARA VERIFICAR LAS LLAVES DE VERCEL
console.log("🔥 Iniciando Angular en Vercel...");
console.log("📦 Project ID inyectado:", environment.firebase.projectId);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(), 

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
  ],
// 👇 2. ATRAPAMOS CUALQUIER ERROR OCULTO Y LO OBLIGAMOS A MOSTRARSE EN ROJO
}).catch(err => console.error('🚨 ERROR FATAL AL ARRANCAR ANGULAR:', err));