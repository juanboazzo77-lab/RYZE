# FitAI

Alimentación, calorías, macros, entrenamientos, progresión, peso, objetivos y un
entrenador personal con IA — en una sola app. Mobile-first, responsive, con
persistencia real.

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript estricto
- **Tailwind v4** + shadcn/ui (Radix) — tema claro/oscuro
- **Prisma 6** → Postgres (Supabase) · migraciones SQL versionadas
- **Supabase Auth** (email/password; OAuth-ready) · RLS por usuario
- **Recharts** para gráficos
- **Anthropic** vía adapter (`src/server/ai/providers`) — el AI Coach nunca ve la
  DB, sólo herramientas tipadas; toda acción que modifica datos pasa por
  confirmación del usuario
- i18n bilingüe (es/en), español por defecto

## Arranque

Ver [`SETUP.md`](./SETUP.md). Resumen:

```bash
pnpm install
cp .env.example .env          # completar con credenciales de Supabase
pnpm db:migrate:deploy
pnpm db:seed
pnpm bootstrap -- --email tu@email.com --password "clave-segura"
pnpm dev
```

## Scripts

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (next) |
| `pnpm test` | Vitest (unit, `src/`) |
| `pnpm db:migrate:new <nombre>` | Nueva migración desde el diff del schema |
| `pnpm db:migrate:deploy` | Aplica migraciones pendientes |
| `pnpm db:migrate:baseline` | Regenera `0001_init` sin base (diff + bloque manual) |
| `pnpm db:seed` | Carga catálogo de logros + bibliotecas |
| `pnpm db:studio` | Prisma Studio |

## Estructura

```
prisma/                  schema + migraciones (0001_init con RLS/triggers)
scripts/                 new-migration, baseline-migration, bootstrap, _0001_manual.sql
src/
  app/
    (auth)/              login · register · forgot/reset password
    (onboarding)/        wizard (Fase 2; hoy stub)
    (app)/               dashboard · nutrition · training · progress · coach
    auth/callback/       intercambio de code (email confirm · reset · OAuth)
  components/
    ui/                  primitivos shadcn
    app-shell/           bottom-nav (móvil) · side-nav (desktop) · header
  i18n/                  diccionarios es/en + provider + helpers server
  server/
    db.ts               PrismaClient singleton
    user-db.ts          forUser(userId) — scoping por usuario
    context.ts          getSession · requireUser (profile + entitlement)
    entitlements.ts     FREE / PRO
    supabase/           clientes SSR (browser · server · middleware · admin)
    ai/                  providers + errors + pricing (gateway/tools: Fase 8)
```

## Plan por fases

Ver el plan completo en `C:\Users\juanb\.claude\plans\inherited-booping-wren.md`.
La Fase 1 (este scaffold) cubre setup, autenticación y base de datos.
