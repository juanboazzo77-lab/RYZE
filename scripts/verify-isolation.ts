/**
 * FitAI — Verificación de aislamiento entre usuarios.
 *
 * Crea dos usuarios de prueba desechables (A y B), les carga datos y comprueba
 * que ningún usuario puede leer ni tocar los datos del otro, por dos vías:
 *
 *   1. Capa de app  — el cliente `forUser(userId)` (misma lógica que
 *      src/server/user-db.ts, reconstruida acá sin `server-only`).
 *   2. Postgres RLS — cliente supabase-js con la anon key, firmado como B.
 *
 * Al terminar borra ambos usuarios (cascada → borra todos sus datos).
 *
 *   pnpm tsx scripts/verify-isolation.ts
 */
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { assertOperationAllowed, scopeArgs, USER_MODELS } from '../src/server/user-db-guard';

try {
  process.loadEnvFile('.env');
} catch {
  console.error('No encontré .env.');
  process.exit(1);
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !ANON || !SERVICE) {
  console.error('Faltan variables de Supabase en .env');
  process.exit(1);
}

const prisma = new PrismaClient();

/** Reproduce forUser() de src/server/user-db.ts (sin el import server-only). */
function forUser(userId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !USER_MODELS.has(model)) return query(args);
          assertOperationAllowed(model, operation);
          return query(scopeArgs(model, operation, args, userId));
        },
      },
    },
  });
}

const results: Array<{ name: string; pass: boolean; detail?: string }> = [];
function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function makeUser(admin: import('@supabase/supabase-js').SupabaseClient, email: string) {
  const password = 'IsoTest2026!';
  const existing = await admin.auth.admin.listUsers();
  const prev = existing.data.users.find((u) => u.email === email);
  if (prev) await admin.auth.admin.deleteUser(prev.id);
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
  // El trigger handle_new_user crea profile+entitlement; esperar un toque.
  for (let i = 0; i < 20; i++) {
    const p = await prisma.profile.findUnique({ where: { id: data.user.id }, select: { id: true } });
    if (p) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  return { id: data.user.id, email, password };
}

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  console.log('Creando usuarios de prueba…');
  const A = await makeUser(admin, 'iso-a@fitai.test');
  const B = await makeUser(admin, 'iso-b@fitai.test');

  try {
    // --- Datos de cada usuario (vía cliente scopeado, como la app) ---
    const goalA = await forUser(A.id).goal.create({
      data: { userId: A.id, type: 'LOSE_FAT', startWeightKg: 90, targetWeightKg: 82, note: 'A-secreto' },
    });
    const goalB = await forUser(B.id).goal.create({
      data: { userId: B.id, type: 'GAIN_MUSCLE', startWeightKg: 70, targetWeightKg: 78, note: 'B-secreto' },
    });
    await forUser(A.id).weightEntry.create({ data: { userId: A.id, date: new Date('2026-01-01'), weightKg: 90 } });
    await forUser(B.id).weightEntry.create({ data: { userId: B.id, date: new Date('2026-01-01'), weightKg: 70 } });

    console.log('\n[1] Capa de app — forUser(B) no ve datos de A');

    const bGoals = await forUser(B.id).goal.findMany();
    check(
      'findMany de goals solo trae los de B',
      bGoals.length === 1 && bGoals[0]?.id === goalB.id,
      `${bGoals.length} fila(s)`,
    );

    const crossGoal = await forUser(B.id).goal.findFirst({ where: { id: goalA.id } });
    check('findFirst({ where: { id: goalA } }) desde B → null', crossGoal === null);

    const bWeights = await forUser(B.id).weightEntry.findMany();
    check(
      'weightEntry.findMany desde B solo trae los de B',
      bWeights.length === 1 && bWeights[0]?.weightKg === 70,
      `${bWeights.length} fila(s)`,
    );

    let blocked = false;
    try {
      // findUnique está bloqueado por el guard sobre modelos de usuario
      await forUser(B.id).goal.findUnique({ where: { id: goalA.id } });
    } catch {
      blocked = true;
    }
    check('findUnique sobre Goal lanza (operación bloqueada)', blocked);

    const upd = await forUser(B.id).goal.updateMany({ where: { id: goalA.id }, data: { note: 'hackeado' } });
    const goalAAfter = await prisma.goal.findUnique({ where: { id: goalA.id }, select: { note: true } });
    check(
      'updateMany de B sobre el goal de A afecta 0 filas',
      upd.count === 0 && goalAAfter?.note === 'A-secreto',
      `count=${upd.count}, note="${goalAAfter?.note}"`,
    );

    const del = await forUser(B.id).goal.deleteMany({ where: { id: goalA.id } });
    const stillThere = await prisma.goal.count({ where: { id: goalA.id } });
    check('deleteMany de B sobre el goal de A borra 0 filas', del.count === 0 && stillThere === 1);

    console.log('\n[2] Postgres RLS — anon key firmado como B');

    const asB = createClient(URL, ANON);
    const signIn = await asB.auth.signInWithPassword({ email: B.email, password: B.password });
    check('sign-in de B con anon key', !signIn.error && !!signIn.data.session);

    const rlsGoals = await asB.from('goal').select('id,note');
    check(
      'SELECT goal vía RLS solo devuelve filas de B',
      !rlsGoals.error && (rlsGoals.data?.length ?? -1) === 1 && rlsGoals.data?.[0]?.note === 'B-secreto',
      rlsGoals.error ? rlsGoals.error.message : `${rlsGoals.data?.length} fila(s)`,
    );

    const rlsWeights = await asB.from('weight_entry').select('weight_kg');
    check(
      'SELECT weight_entry vía RLS solo devuelve filas de B',
      !rlsWeights.error && (rlsWeights.data?.length ?? -1) === 1 && Number(rlsWeights.data?.[0]?.weight_kg) === 70,
      rlsWeights.error ? rlsWeights.error.message : `${rlsWeights.data?.length} fila(s)`,
    );

    const rlsUpd = await asB.from('goal').update({ note: 'hackeado-rls' }).eq('id', goalA.id).select();
    const goalAAfterRls = await prisma.goal.findUnique({ where: { id: goalA.id }, select: { note: true } });
    check(
      'UPDATE del goal de A vía RLS no cambia nada',
      (rlsUpd.data?.length ?? 0) === 0 && goalAAfterRls?.note === 'A-secreto',
      `filas devueltas=${rlsUpd.data?.length ?? 0}`,
    );

    console.log('\n[3] Postgres RLS — anon key sin sesión');
    const anonOnly = createClient(URL, ANON);
    const anonGoals = await anonOnly.from('goal').select('id');
    check(
      'SELECT goal sin sesión devuelve 0 filas',
      !anonGoals.error && (anonGoals.data?.length ?? -1) === 0,
      anonGoals.error ? anonGoals.error.message : `${anonGoals.data?.length} fila(s)`,
    );
  } finally {
    console.log('\nLimpieza: borrando usuarios de prueba…');
    await admin.auth.admin.deleteUser(A.id);
    await admin.auth.admin.deleteUser(B.id);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} comprobaciones OK`);
  if (failed.length) {
    console.error('FALLARON:', failed.map((f) => f.name).join('; '));
    process.exit(1);
  }
  console.log('✓ Aislamiento verificado (capa de app + RLS).');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
