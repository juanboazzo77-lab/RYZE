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
    // Sin esto, el WebView bloquea la navegación al iniciar sesión con Google
    // o Apple (van a un dominio distinto al de `url` y vuelven vía Supabase).
    allowNavigation: [
      'accounts.google.com',
      'appleid.apple.com',
      '*.supabase.co',
    ],
  },
};

export default config;
