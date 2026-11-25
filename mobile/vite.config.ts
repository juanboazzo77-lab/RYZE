import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * La app independiente (iPhone y Android). Se arma como archivos que van DENTRO de la app, así abre sin internet.
 * Comparte con la web la lógica y los estilos de `src/`; nunca código que dependa de Next o del servidor.
 */
export default defineConfig({
  root: here('.'),
  // Rutas relativas: dentro del teléfono los archivos no se sirven desde la raíz de un dominio.
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': here('../src') } },
  // El postcss.config de la raíz es de la web; acá Tailwind lo maneja su plugin.
  css: { postcss: {} },
  build: { outDir: here('./dist'), emptyOutDir: true, target: 'es2022' },
  server: { port: 5175, strictPort: true },
});
