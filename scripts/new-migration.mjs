/**
 * Genera un archivo de migración comparando el estado REAL de la base
 * (datasource de prisma/schema.prisma) contra los modelos deseados del schema.
 *
 * No usa shadow database (el pooler de Supabase no permite crearla). Flujo:
 *
 *   1. Editás prisma/schema.prisma
 *   2. pnpm db:migrate:new <nombre_en_snake_case>
 *   3. Revisás el SQL generado (RLS de tablas nuevas, triggers set_updated_at,
 *      índices GIN van a mano) en prisma/migrations/<timestamp>_<nombre>/migration.sql
 *   4. pnpm db:migrate:deploy
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error('Uso: pnpm db:migrate:new <nombre_snake_case>');
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const dir = join('prisma', 'migrations', `${stamp}_${name}`);
mkdirSync(dir, { recursive: true });

const sql = execFileSync(
  'node',
  [
    join('node_modules', 'prisma', 'build', 'index.js'),
    'migrate',
    'diff',
    '--from-schema-datasource',
    'prisma/schema.prisma',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--script',
  ],
  { encoding: 'utf8' },
);

if (!sql.trim() || sql.includes('This is an empty migration')) {
  console.log('No hay cambios de schema para migrar.');
  process.exit(0);
}

const file = join(dir, 'migration.sql');
writeFileSync(file, sql, 'utf8');
console.log(`✓ Migracion generada: ${file}`);
console.log('  Revisala (RLS/triggers/indices GIN van a mano) y despues: pnpm db:migrate:deploy');
