/**
 * Genera la migración inicial `prisma/migrations/0001_init/migration.sql` SIN
 * necesidad de una base de datos:
 *
 *   1. `prisma migrate diff --from-empty --to-schema-datamodel` → DDL de tablas,
 *      enums, índices y FKs derivado del schema.
 *   2. Le concatena `scripts/_0001_manual.sql` (extensiones, FK a auth.users,
 *      triggers handle_new_user / set_updated_at, índices GIN pg_trgm, RLS).
 *
 * Idempotente: sobrescribe el archivo. Correr sólo si hay que regenerar la
 * baseline (p. ej. cambió el schema antes del primer deploy).
 *
 *   pnpm db:migrate:baseline
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const dir = join('prisma', 'migrations', '0001_init');
mkdirSync(dir, { recursive: true });

const ddl = execFileSync(
  'node',
  [
    join('node_modules', 'prisma', 'build', 'index.js'),
    'migrate',
    'diff',
    '--from-empty',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--script',
  ],
  { encoding: 'utf8' },
);

const manual = readFileSync(join('scripts', '_0001_manual.sql'), 'utf8');

const out = `${ddl.trim()}\n\n${manual.trim()}\n`;
const file = join(dir, 'migration.sql');
writeFileSync(file, out, 'utf8');
console.log(`✓ Baseline regenerada: ${file} (${out.length} bytes)`);
