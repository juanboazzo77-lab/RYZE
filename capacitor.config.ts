import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.forzaai.mobile',
  appName: 'Forza AI',
  webDir: 'out',
  server: {
    // La app es un server Next.js real (auth, DB, IA) — Capacitor no empaqueta
    // archivos estáticos locales, sino que carga la web ya publicada.
    url: 'https://forzaai.app',
    cleartext: false,
  },
};

export default config;
