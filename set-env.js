const fs = require('fs');

// Vercel inyectará los valores reales aquí mediante process.env
const envConfigFile = `export const environment = {
  production: true,
  firebase: {
    apiKey: "${process.env.FIREBASE_API_KEY}",
    authDomain: "${process.env.FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.FIREBASE_APP_ID}",
    measurementId: "${process.env.FIREBASE_MEASUREMENT_ID}"
  },
  llaveCifrado: "${process.env.LLAVE_CIFRADO}",
  urlGoogleScript: "${process.env.URL_GOOGLE_SCRIPT}"
};`;

// Escribe el archivo con las llaves reales justo antes de compilar
fs.writeFileSync('./src/environments/environment.prod.ts', envConfigFile);
console.log('✅ Archivo environment.prod.ts generado con éxito usando las variables de Vercel.');