/**
 * FitAI — Datos de demo. Crea (o resetea) una cuenta lista para probar toda la
 * app: perfil completo, objetivos, 35 días de peso, plan de 4 días activo,
 * ~13 entrenamientos con progresión, récords personales, comidas de la última
 * semana y logros.
 *
 * Idempotente: borra los datos de la cuenta demo y los vuelve a crear.
 *
 *   pnpm db:seed:demo
 *
 * Requiere .env con SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import process from 'node:process';
import { PrismaClient, type MealType } from '@prisma/client';

try {
  process.loadEnvFile('.env');
} catch {
  console.error('No encontré .env. Ver SETUP.md.');
  process.exit(1);
}

const DEMO_EMAIL = 'demo@fitai.app';
const DEMO_PASSWORD = 'FitaiDemo2026';
const prisma = new PrismaClient();

const DAY = 86_400_000;
const utcDay = (offsetDays: number) => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(d.getTime() - offsetDays * DAY);
};

async function ensureAuthUser(): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');

  const { createClient } = await import('@supabase/supabase-js');
  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (data.user) return data.user.id;

  if (error && !/already been registered|already exists/i.test(error.message)) {
    throw error;
  }
  // Ya existía: buscar por email.
  const existing = await prisma.profile.findFirst({ where: { email: DEMO_EMAIL }, select: { id: true } });
  if (existing) return existing.id;

  const list = await admin.auth.admin.listUsers();
  const u = list.data.users.find((x) => x.email === DEMO_EMAIL);
  if (!u) throw new Error('No pude resolver el id del usuario demo');
  return u.id;
}

async function wipeUserData(userId: string) {
  await prisma.$transaction([
    prisma.weeklyCheckin.deleteMany({ where: { userId } }),
    prisma.userAchievement.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.notificationPreference.deleteMany({ where: { userId } }),
    prisma.personalRecord.deleteMany({ where: { userId } }),
    prisma.workout.deleteMany({ where: { userId } }), // cascada: workoutExercise -> workoutSet
    prisma.workoutPlan.deleteMany({ where: { userId } }), // cascada: planDay -> planExercise
    prisma.foodEntry.deleteMany({ where: { userId } }),
    prisma.meal.deleteMany({ where: { userId } }), // cascada: mealItem
    prisma.weightEntry.deleteMany({ where: { userId } }),
    prisma.dailyActivity.deleteMany({ where: { userId } }),
    prisma.nutritionTarget.deleteMany({ where: { userId } }),
    prisma.goal.deleteMany({ where: { userId } }),
    prisma.aiConversation.deleteMany({ where: { userId } }),
    prisma.aiGeneration.deleteMany({ where: { userId } }),
    prisma.aiActionDraft.deleteMany({ where: { userId } }),
    prisma.aiUsageDaily.deleteMany({ where: { userId } }),
  ]);
}

async function main() {
  const userId = await ensureAuthUser();

  await prisma.profile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: DEMO_EMAIL },
  });
  // COACH: el plan más top, para que la demo muestre también el perfil de
  // coaching y la individualización a medida (features exclusivas de ese plan).
  await prisma.entitlement.upsert({
    where: { userId },
    update: { tier: 'COACH', status: 'ACTIVE' },
    create: { userId, tier: 'COACH', status: 'ACTIVE' },
  });

  await wipeUserData(userId);

  // ---- Perfil ----
  await prisma.profile.update({
    where: { id: userId },
    data: {
      name: 'Juan',
      sex: 'MALE',
      birthdate: new Date('1994-06-15T00:00:00Z'),
      heightCm: 180,
      experienceLevel: 'INTERMEDIATE',
      primaryGoal: 'LOSE_FAT',
      trainingPlace: 'GYM',
      activityLevel: 'MODERATE',
      daysAvailable: 4,
      sessionMinutes: 60,
      equipment: ['FULL_GYM'],
      dietaryPrefs: ['OMNIVORE', 'HIGH_PROTEIN'],
      excludedFoods: [],
      allergies: [],
      mealsPerDay: 4,
      injuries: null,
      trainingExperienceNote: 'Vengo entrenando fuerza hace 2 años, ahora en etapa de definición.',
      locale: 'ES',
      unitSystem: 'METRIC',
      timezone: 'America/Argentina/Buenos_Aires',
      weekStart: 1,
      onboardingCompletedAt: new Date(),
    },
  });

  // ---- Objetivo + targets ----
  await prisma.goal.create({
    data: {
      userId,
      type: 'LOSE_FAT',
      startWeightKg: 82,
      targetWeightKg: 76,
      weeklyRateKg: 0.5,
      status: 'ACTIVE',
    },
  });
  await prisma.nutritionTarget.create({
    data: {
      userId,
      effectiveFrom: utcDay(34),
      kcal: 2300,
      proteinG: 185,
      carbsG: 235,
      fatG: 70,
      source: 'CALCULATED',
      active: true,
    },
  });

  // ---- 35 días de peso (82 -> ~78.6) con ruido, salteando 1 día/semana ----
  const weights: { date: Date; weightKg: number }[] = [];
  for (let i = 34; i >= 0; i--) {
    if (i % 7 === 4) continue;
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.6)) * 0.35;
    const w = Math.round((82 - 0.1 * (34 - i) + noise) * 10) / 10;
    weights.push({ date: utcDay(i), weightKg: w });
  }
  await prisma.weightEntry.createMany({ data: weights.map((w) => ({ userId, ...w })) });

  // ---- 30 días de actividad (pasos ~7k con ruido, más los días de gym) ----
  const steps: { date: Date; steps: number; activeMinutes: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    if (i % 6 === 3) continue; // algún día sin registrar
    const base = 7000 + Math.round(Math.sin(i * 0.9) * 1500);
    const gymBonus = i % 2 === 0 ? 1800 : 0;
    steps.push({ date: utcDay(i), steps: base + gymBonus, activeMinutes: 30 + (i % 3) * 15 });
  }
  await prisma.dailyActivity.createMany({ data: steps.map((s) => ({ userId, ...s })) });

  // ---- Biblioteca de ejercicios ----
  const exRows = await prisma.exercise.findMany({ select: { id: true, name: true } });
  const ex = new Map(exRows.map((e) => [e.name, e.id] as const));
  const E = (name: string) => {
    const id = ex.get(name);
    if (!id) throw new Error(`Falta el ejercicio de biblioteca: ${name} (corré pnpm db:seed primero)`);
    return id;
  };

  // ---- Plan de 4 días ----
  const plan = await prisma.workoutPlan.create({
    data: {
      userId,
      name: 'PPL + Upper',
      description: 'Push / Pull / Piernas / Upper — 4 días.',
      isActive: true,
      source: 'MANUAL',
    },
  });

  const dayDefs: Array<{ name: string; weekday: number; items: Array<[string, number, number, number, number]> }> = [
    {
      name: 'Push',
      weekday: 1,
      items: [
        ['Press de banca', 4, 6, 8, 150],
        ['Press inclinado con mancuernas', 3, 8, 10, 120],
        ['Press militar', 3, 8, 10, 120],
        ['Elevaciones laterales', 4, 12, 15, 60],
        ['Extensión de tríceps en polea', 3, 10, 12, 60],
      ],
    },
    {
      name: 'Pull',
      weekday: 2,
      items: [
        ['Peso muerto convencional', 3, 4, 6, 180],
        ['Dominadas', 4, 6, 10, 120],
        ['Remo con barra', 3, 8, 10, 120],
        ['Jalón al pecho', 3, 10, 12, 90],
        ['Curl de bíceps con barra', 3, 10, 12, 60],
      ],
    },
    {
      name: 'Piernas',
      weekday: 4,
      items: [
        ['Sentadilla', 4, 5, 8, 180],
        ['Prensa de piernas', 3, 10, 12, 120],
        ['Peso muerto rumano', 3, 8, 10, 120],
        ['Curl femoral', 3, 12, 15, 60],
        ['Elevación de talones', 4, 12, 20, 45],
      ],
    },
    {
      name: 'Upper',
      weekday: 5,
      items: [
        ['Press de banca', 3, 8, 10, 120],
        ['Remo en polea baja', 3, 10, 12, 90],
        ['Press militar', 3, 8, 10, 120],
        ['Jalón al pecho', 3, 10, 12, 90],
        ['Curl martillo', 3, 10, 12, 60],
      ],
    },
  ];

  const planDays: Array<{ id: string; name: string; items: typeof dayDefs[number]['items'] }> = [];
  for (let di = 0; di < dayDefs.length; di++) {
    const dd = dayDefs[di]!;
    const day = await prisma.planDay.create({
      data: {
        planId: plan.id,
        name: dd.name,
        orderIndex: di,
        weekday: dd.weekday,
        exercises: {
          create: dd.items.map(([n, sets, rMin, rMax, rest], oi) => ({
            exerciseId: E(n),
            orderIndex: oi,
            targetSets: sets,
            targetRepsMin: rMin,
            targetRepsMax: rMax,
            targetRir: 2,
            restSeconds: rest,
          })),
        },
      },
    });
    planDays.push({ id: day.id, name: dd.name, items: dd.items });
  }

  // ---- Historial de entrenamientos con progresión (4 semanas) ----
  // Peso base por ejercicio (semana 0) + incremento semanal.
  const baseWeight: Record<string, [number, number]> = {
    'Press de banca': [72.5, 2.5],
    'Press inclinado con mancuernas': [28, 1],
    'Press militar': [45, 2.5],
    'Elevaciones laterales': [12, 0.5],
    'Extensión de tríceps en polea': [30, 1.25],
    'Peso muerto convencional': [120, 5],
    Dominadas: [0, 2.5],
    'Remo con barra': [70, 2.5],
    'Jalón al pecho': [65, 2.5],
    'Curl de bíceps con barra': [30, 1.25],
    Sentadilla: [100, 5],
    'Prensa de piernas': [180, 10],
    'Peso muerto rumano': [90, 2.5],
    'Curl femoral': [45, 2.5],
    'Elevación de talones': [80, 5],
    'Remo en polea baja': [65, 2.5],
    'Curl martillo': [14, 0.5],
  };

  let workoutCount = 0;
  const prByExercise = new Map<string, { weightKg: number; reps: number; date: Date }>();

  for (let week = 3; week >= 0; week--) {
    // Días (hace N días) de Push, Pull, Piernas, Upper. La semana en curso se
    // acerca a hoy: última sesión ayer → racha visible de 3 en el dashboard.
    const daySlots = week === 0 ? [5, 3, 2, 1] : [week * 7 + 6, week * 7 + 5, week * 7 + 3, week * 7 + 2];
    for (let d = 0; d < planDays.length; d++) {
      // Semana 2 se saltea el Upper (constancia realista, no perfecta).
      if (week === 2 && d === 3) continue;
      const pd = planDays[d]!;
      const when = utcDay(daySlots[d]!);
      workoutCount++;

      const wk = await prisma.workout.create({
        data: {
          userId,
          planId: plan.id,
          planDayId: pd.id,
          name: pd.name,
          status: 'COMPLETED',
          startedAt: new Date(when.getTime() + 18 * 3600_000),
          finishedAt: new Date(when.getTime() + 18 * 3600_000 + 55 * 60_000),
          durationSeconds: 55 * 60 + workoutCount * 30,
          perceivedEffort: 6 + ((workoutCount + week) % 3),
        },
        select: { id: true },
      });

      for (let oi = 0; oi < pd.items.length; oi++) {
        const [name, sets, rMin, rMax] = pd.items[oi]!;
        const [w0, inc]: [number, number] = baseWeight[name] ?? [20, 1];
        const weeksDone = 3 - week;
        const weight = Math.round((w0 + inc * weeksDone) * 4) / 4;
        const we = await prisma.workoutExercise.create({
          data: {
            workoutId: wk.id,
            exerciseId: E(name),
            orderIndex: oi,
            targetRepsMin: rMin,
            targetRepsMax: rMax,
            targetRir: 2,
          },
          select: { id: true },
        });
        for (let s = 1; s <= sets; s++) {
          const reps = Math.max(rMin, rMax - (s - 1) - (s === sets ? 1 : 0));
          await prisma.workoutSet.create({
            data: {
              workoutExerciseId: we.id,
              setNumber: s,
              weightKg: weight > 0 ? weight : null,
              reps,
              rir: 2,
              isWarmup: false,
              isCompleted: true,
              completedAt: new Date(when.getTime() + 18 * 3600_000 + s * 4 * 60_000),
            },
          });
          // record del ejercicio (mejor peso de la historia)
          if (weight > 0) {
            const prev = prByExercise.get(name);
            if (!prev || weight > prev.weightKg) {
              prByExercise.set(name, { weightKg: weight, reps, date: when });
            }
          }
        }
      }
    }
  }

  // ---- Récords personales (los principales) ----
  const prLifts = ['Press de banca', 'Sentadilla', 'Peso muerto convencional', 'Press militar', 'Remo con barra'];
  for (const name of prLifts) {
    const best = prByExercise.get(name);
    if (!best) continue;
    const est1rm = Math.round(best.weightKg * (1 + best.reps / 30) * 10) / 10;
    await prisma.personalRecord.createMany({
      data: [
        { userId, exerciseId: E(name), type: 'MAX_WEIGHT', value: best.weightKg, unit: 'kg', achievedAt: best.date },
        { userId, exerciseId: E(name), type: 'EST_1RM', value: est1rm, unit: 'kg', achievedAt: best.date },
      ],
    });
  }

  // ---- Comidas de los últimos 8 días ----
  const foodRows = await prisma.food.findMany({ select: { id: true, name: true, kcalPer100: true, proteinPer100: true, carbsPer100: true, fatPer100: true } });
  const food = new Map(foodRows.map((f) => [f.name, f] as const));
  const F = (name: string) => {
    const f = food.get(name);
    if (!f) throw new Error(`Falta el alimento de biblioteca: ${name}`);
    return f;
  };
  const gramsEntry = (name: string, grams: number) => {
    const f = F(name);
    const k = grams / 100;
    return {
      foodId: f.id,
      quantity: grams,
      unit: 'g',
      kcal: Math.round(f.kcalPer100 * k),
      proteinG: Math.round(f.proteinPer100 * k * 10) / 10,
      carbsG: Math.round(f.carbsPer100 * k * 10) / 10,
      fatG: Math.round(f.fatPer100 * k * 10) / 10,
    };
  };

  const dailyPlan: Array<[MealType, Array<[string, number]>]> = [
    ['BREAKFAST', [['Avena', 80], ['Leche descremada', 250], ['Banana', 120]]],
    ['LUNCH', [['Pechuga de pollo (cocida)', 200], ['Arroz blanco (cocido)', 200], ['Palta', 50]]],
    ['MERIENDA', [['Yogur natural descremado', 200], ['Almendras', 20], ['Manzana', 150]]],
    ['DINNER', [['Carne magra de vaca (cocida)', 180], ['Papa (cocida)', 250], ['Aceite de oliva', 10]]],
  ];

  for (let i = 7; i >= 0; i--) {
    const date = utcDay(i);
    for (const [mealType, items] of dailyPlan) {
      let pos = 0;
      for (const [name, grams] of items) {
        // pequeña variación diaria en las cantidades
        const g = Math.round(grams * (1 + Math.sin(i + name.length) * 0.08));
        await prisma.foodEntry.create({
          data: {
            userId,
            date,
            mealType,
            ...gramsEntry(name, g),
            isEstimated: false,
            source: 'MANUAL',
            position: pos++,
          },
        });
      }
    }
  }

  // ---- Logros ----
  // connection_limit=1: contar en secuencia, no en Promise.all.
  const completed = await prisma.workout.count({ where: { userId, status: 'COMPLETED' } });
  const prCount = await prisma.personalRecord.count({ where: { userId } });
  const weightCount = await prisma.weightEntry.count({ where: { userId } });
  const foodCount = await prisma.foodEntry.count({ where: { userId } });
  const catalog = await prisma.achievement.findMany({ select: { key: true, threshold: true } });
  const thr = new Map(catalog.map((a) => [a.key, a.threshold ?? 0] as const));
  const progressByKey: Record<string, number> = {
    first_workout: Math.min(completed, 1),
    workouts_10: Math.min(completed, 10),
    workouts_30: Math.min(completed, 30),
    first_pr: Math.min(prCount, 1),
    weight_log_30: Math.min(weightCount, 30),
    first_meal_logged: Math.min(foodCount, 1),
  };
  for (const [key, progress] of Object.entries(progressByKey)) {
    if (progress <= 0) continue;
    const threshold = thr.get(key) ?? 0;
    await prisma.userAchievement.create({
      data: {
        userId,
        achievementKey: key,
        progress,
        unlockedAt: threshold > 0 && progress >= threshold ? utcDay(2) : null,
      },
    });
  }

  console.log(`✓ Demo lista: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  ${weights.length} pesos · ${workoutCount} entrenos · ${prCount} PRs · ${foodCount} entradas de comida`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
