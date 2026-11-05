// El panel usa la MISMA base que la app: copia su schema de Prisma y genera el cliente acá, para que
// quede dentro de las dependencias del panel (no en las de la app).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const from = path.resolve(here, '../../prisma/schema.prisma');
const toDir = path.resolve(here, '../prisma');
fs.mkdirSync(toDir, { recursive: true });
fs.copyFileSync(from, path.join(toDir, 'schema.prisma'));
console.log('schema copiado desde', from);
