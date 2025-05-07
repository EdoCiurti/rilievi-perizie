import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tua_azienda.rilievi',
  appName: 'Rilievi & Perizie',
  webDir: 'www',
  server: {
    androidScheme: 'http',
    cleartext: true // Consente connessioni HTTP non sicure (per sviluppo)
  },
  android: {
    allowMixedContent: true // Consente mix di contenuti HTTP e HTTPS
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000
    },
    Camera: {
      permissionRequestMessage: "Questa app necessita di accesso alla fotocamera per scattare foto delle perizie"
    },
    Geolocation: {
      permissionRequestMessage: "Questa app necessita dell'accesso alla posizione per registrare il luogo delle perizie"
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false
      }
    }
  }
};

export default config;