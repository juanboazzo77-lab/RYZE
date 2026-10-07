import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.forzaai.mobile',
  appName: 'Forza AI',
  webDir: 'out',
  server: {
    // La app es un server Next.js real (auth, DB, IA) — Capacitor no empaqueta
    // archivos estáticos locales, sino que carga la web ya publicada.
    url: 'https://www.forzaai.app',
    cleartext: false,
    // El apex redirige a www: sin esto Capacitor bloquea la redirección y queda pantalla en blanco.
    allowNavigation: ['forzaai.app', '*.forzaai.app'],
  },
};

export default config;
