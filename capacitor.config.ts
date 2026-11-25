import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Hay dos apps que salen de este proyecto:
 *   - la actual (sin variables): una ventana que carga la web publicada;
 *   - la independiente (FORZA_APP=nueva): las pantallas de `mobile/` van DENTRO de la app y abre sin internet.
 * La actual sigue siendo la que se publica hasta que la nueva esté completa (ver docs/app-independiente/DISENO.md).
 */
const base = {
  // Mismo identificador a propósito: la nueva va a reemplazar a la actual.
  appId: 'app.forzaai.mobile',
  appName: 'Forza AI',
};

const web: CapacitorConfig = {
  ...base,
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

const standalone: CapacitorConfig = {
  ...base,
  // Sin `server.url`: la app se sirve desde sus propios archivos (capacitor://localhost y https://localhost).
  webDir: 'mobile/dist',
};

const config: CapacitorConfig = process.env.FORZA_APP === 'nueva' ? standalone : web;

export default config;
