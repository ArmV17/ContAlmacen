const fs = require('fs');

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

// 🔥 EL TRUCO ESTÁ AQUÍ: Obligamos a Vercel a escribir las llaves en AMBOS archivos
fs.writeFileSync('./src/environments/environment.ts', envConfigFile);
fs.writeFileSync('./src/environments/environment.prod.ts', envConfigFile);

console.log('✅ Archivos de entorno inyectados con éxito para la compilación.');