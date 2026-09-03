# Puesta en marcha — FitAI

Seguí estos pasos una sola vez. Cuando termines el paso 4, avisame y yo corro
migraciones, seed y el arranque.

---

## 1. Node.js

Necesitás Node 20+ (recomendado 22 LTS) y pnpm:

```bash
node --version
corepack enable
```

---

## 2. Crear el proyecto en Supabase

1. Entrá a <https://supabase.com> y creá una cuenta (gratis).
2. **New project**:
   - Name: `fitai-dev`
   - Database password: generá una y **guardala**.
   - Region: la más cercana (p. ej. `South America (São Paulo)`).
3. Esperá ~2 minutos a que termine de aprovisionar.

> FitAI usa su propio proyecto de Supabase, separado de cualquier otro.

---

## 3. Copiar las credenciales

1. **Project Settings → API**. Copiá:
   - `Project URL`
   - `anon` `public` key
   - `service_role` `secret` key
2. **Project Settings → Database → Connection string → "URI"**. Copiá la cadena
   del **Transaction pooler** (puerto `6543`) y la **directa** (puerto `5432`).
   Reemplazá `[YOUR-PASSWORD]` por la contraseña del paso 2.

---

## 4. Crear el archivo `.env`

En la raíz (`D:\fitai`), copiá `.env.example` como `.env` y completá:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Connection string **pooler 6543**, con `?pgbouncer=true&connection_limit=1` al final |
| `DIRECT_URL` | Connection string **directa 5432** |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role secret key |

`ANTHROPIC_API_KEY` se completa recién en la Fase 8 (AI Coach); dejalo vacío.

```bash
cp .env.example .env
```

> Cuando tengas el `.env` listo, **decímelo**.

---

## Qué va a pasar después (lo corro yo)

```bash
pnpm install                 # dependencias (ya hecho en el scaffold)
pnpm db:migrate:deploy       # crea tablas + RLS + triggers (0001_init)
pnpm db:seed                 # logros + biblioteca de ejercicios y alimentos
pnpm bootstrap -- --email vos@ejemplo.com --password "una-clave-segura"
pnpm dev                     # http://localhost:3000
```

Comprobación rápida:

- `http://localhost:3000/dashboard` sin sesión → redirige a `/login`.
- Login con el usuario del `bootstrap` → te manda al onboarding (stub) → "Ir al
  inicio" → dashboard.
- `/register` crea otra cuenta; `/forgot-password` manda el mail de recuperación.
- En Supabase → **Authentication → Policies**: las tablas de usuario tienen RLS
  habilitada; **Database → Triggers**: existe `on_auth_user_created`.
