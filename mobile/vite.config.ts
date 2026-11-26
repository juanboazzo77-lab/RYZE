import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { onlinePlugin } from './online-plugin';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * La app independiente (iPhone y Android). Se arma como archivos que van DENTRO de la app, así abre sin internet.
 * Comparte con la web la lógica y los estilos de `src/`; nunca código que dependa de Next o del servidor.
 */
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, here('..'), 'NEXT_PUBLIC_'), ...process.env };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');

  return {
    root: here('.'),
    // Rutas relativas: dentro del teléfono los archivos no se sirven desde la raíz de un dominio.
    base: './',
    plugins: [onlinePlugin(), react(), tailwindcss()],
    resolve: { alias: { '@': here('../src') } },
    // Sólo estos tres valores entran en la app, y los tres son públicos. Se nombran uno por uno a propósito: lo que
    // va dentro de la app lo puede leer cualquiera.
    define: {
      __SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __SUPABASE_ANON_KEY__: JSON.stringify(supabaseKey),
      __API_URL__: JSON.stringify(process.env.FORZA_API_URL || 'https://www.forzaai.app'),
    },
    // El postcss.config de la raíz es de la web; acá Tailwind lo maneja su plugin.
    css: { postcss: {} },
    build: { outDir: here('./dist'), emptyOutDir: true, target: 'es2022' },
    server: { port: 5175, strictPort: true },
  };
});
