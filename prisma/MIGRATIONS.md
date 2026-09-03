# Migraciones de base de datos

El proyecto usa **migraciones formales versionadas** aplicadas con
`prisma migrate deploy` (nunca `migrate dev`).

## Por qué no `prisma migrate dev`

`migrate dev` necesita una *shadow database* que Prisma crea y destruye sola. El
pooler de Supabase no permite crear bases nuevas, así que el flujo es:

- **Cambios de schema:** `migrate diff` genera el SQL sin shadow DB.
- **Aplicar:** `migrate deploy`.

## Migración inicial

`0001_init/migration.sql` se generó con:

```
prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

y luego se le agregó **a mano** al final:

- Extensiones (`pgcrypto`, `pg_trgm`).
- FK de `profile.id` → `auth.users(id)` (`ON DELETE CASCADE`).
- Función + trigger `handle_new_user` (crea `profile` + `entitlement` al registrarse).
- Función + triggers `set_updated_at` en todas las tablas con `updated_at`.
- Índices GIN `pg_trgm` en `food.name` y `exercise.name` (buscadores).
- `ROW LEVEL SECURITY` + políticas en todas las tablas.

## Flujo para cambiar el schema

1. Editá `prisma/schema.prisma`.
2. Generá el `.sql`:
   - **Preferido** (no toca la base): `pnpm db:migrate:diff` ×
     `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script`
     (necesita shadow DB). Si no hay shadow, escribí el `ALTER TABLE` a mano en
     `prisma/migrations/<timestamp>_<nombre>/migration.sql`.
   - `pnpm db:migrate:new` usa `--from-schema-datasource` (introspección de la
     base real) y **falla** por la FK cross-schema `profile → auth.users`
     (`P4002`). No la uses hasta resolver eso.
3. **Revisá el SQL.** Lo que Prisma no modela se agrega a mano (RLS de tablas
   nuevas, triggers `set_updated_at`, índices especiales).
4. `pnpm db:migrate:deploy`
5. `pnpm db:migrate:status`

## Reglas

- Nunca editar una migración ya aplicada. Si algo salió mal, se crea una nueva.
- Las migraciones se versionan en git.
- El rol de `DIRECT_URL` (rol `postgres` de Supabase) tiene `BYPASSRLS`: las
  migraciones y Prisma en runtime **no** están sujetas a RLS. La garantía de
  aislamiento entre usuarios en la app es `forUser()` (`src/server/user-db.ts`);
  RLS protege el acceso directo vía PostgREST / anon key.
