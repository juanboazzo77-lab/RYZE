import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const root = here('..');

/** Acciones de la web que en la app se piden al servidor: cada una tiene su reemplazo con los mismos nombres. */
const REMOTE: Record<string, string> = {
  'src/features/coach/actions.ts': here('./src/online/coach-actions.ts'),
};

/** Lo que nunca puede ir adentro de la app: lo puede leer cualquiera. */
const SERVER_ONLY = /^src\/(server\/(?!mobile\/(rpc-call)\.ts)|features\/.+\/(actions|queries|[a-z-]+-actions)\.ts$)/;

/**
 * Permite usar en la app las mismas pantallas que la web: cambia sus acciones de servidor por pedidos a internet, y
 * corta el armado si algo del servidor se llega a colar.
 */
export function onlinePlugin(): Plugin {
  return {
    name: 'forza-online',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source === 'next/link') return here('./src/online/next-link.tsx');
      if (!importer) return null;
      const found = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!found) return null;
      const file = path.relative(root, found.id).replace(/\\/g, '/');
      if (REMOTE[file]) return REMOTE[file];
      if (SERVER_ONLY.test(file) || file.startsWith('node_modules/server-only') || source === 'server-only') {
        this.error(`La app no puede incluir código del servidor: ${file} (lo importa ${path.relative(root, importer)})`);
      }
      return null;
    },
  };
}
