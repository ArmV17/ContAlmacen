import { bootstrapApplication } from '@angular/platform-browser';
// 👇 1. AGREGAMOS withDebugTracing EN ESTA LÍNEA
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules, withDebugTracing } from '@angular/router'; 
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient } from '@angular/common/http'; 

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

console.log("🔥 Iniciando Angular en Vercel...");
console.log("📦 Project ID inyectado:", environment.firebase.projectId);

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    // 👇 2. ACTIVAMOS EL RADAR AQUÍ
    provideRouter(routes, withPreloading(PreloadAllModules), withDebugTracing()), 
    provideHttpClient(), 

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
  ],
}).catch(err => console.error('🚨 ERROR FATAL AL ARRANCAR ANGULAR:', err));