import 'server-only';
import { DateTime } from 'luxon';
import { prisma } from './db';
import { forUser } from './user-db';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { buildCoachProfileLines } from '@/features/coach-profile/queries';
import { buildSportContextLines } from '@/features/sports/queries';
import { EXPERIENCE_LABEL, GOAL_LABEL, SEX_LABEL } from '@/features/trainer/copy';

/**
 * Todo lo que el entrenador ve de un cliente además de lo básico de la ficha: el perfil completo con
 * todo lo que respondió, el cuestionario de coaching, los deportes, los récords, la actividad diaria y
 * el detalle de cada entrenamiento y de cada día de comida. Sólo con un vínculo activo con el
 * entrenador aprobado; sin él devuelve null.
 */

const isoOf = (d: Date) => d.toISOString().slice(0, 10);

const PLACE: Record<string, string> = { GYM: 'Gimnasio', HOME: 'En casa', BOTH: 'Gimnasio y casa' };
const ACTIVITY: Record<string, string> = {
  SEDENTARY: 'Sedentario',
  LIGHT: 'Ligera',
  MODERATE: 'Moderada',
  ACTIVE: 'Activa',
  VERY_ACTIVE: 'Muy activa',
};
const PR_TYPE: Record<string, string> = {
  MAX_WEIGHT: 'Peso máximo',
  MAX_REPS: 'Repeticiones máximas',
  MAX_VOLUME: 'Volumen máximo',
  EST_1RM: '1RM estimado',
};
const MEAL: Record<string, string> = {
  BREAKFAST: 'Desayuno',
  LUNCH: 'Almuerzo',
  MERIENDA: 'Merienda',
  DINNER: 'Cena',
  SNACK: 'Snack',
};

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String).filter(Boolean) : []);

export interface FactSection {
  title: string;
  rows: Array<{ label: string; value: string }>;
}

export interface ClientExtras {
  /** Todo lo que el cliente cargó de sí mismo, agrupado. */
  facts: FactSection[];
  /** Lo que respondió en el cuestionario de coaching (salud, comida, entrenamiento, meta, estilo de vida). */
  coachingLines: string[];
  /** Deportes que practica y competencias. */
  sportLines: string[];
  records: Array<{ exercise: string; type: string; value: number; unit: string; date: string }>;
  steps: Array<{ date: string; steps: number; activeMinutes: number | null }>;
  workouts: Array<{
    name: string;
    date: string;
    minutes: number | null;
    effort: number | null;
    notes: string | null;
    exercises: Array<{ name: string; sets: number; best: string | null }>;
  }>;
  nutritionDays: Array<{ date: string; kcal: number; proteinG: number; carbsG: number; fatG: number }>;
  todayMeals: Array<{ meal: string; name: string; quantity: string; kcal: number }>;
  weights: Array<{ date: string; weightKg: number; note: string | null }>;
}

export async function getClientExtras(trainerId: string, clientId: string, timezone: string): Promise<ClientExtras | null> {
  const link = await prisma.trainerClient.findFirst({
    where: { trainerId, clientId, status: 'ACTIVE', trainer: { status: 'ACTIVE' } },
    select: { id: true },
  });
  if (!link) return null;

  const profile = await prisma.profile.findUnique({ where: { id: clientId } });
  if (!profile) return null;
  const db = forUser(clientId);
  const todayISO = localTodayISO(timezone);
  const since14 = isoToUtcDate(addDaysISO(todayISO, -13));
  const since180 = isoToUtcDate(addDaysISO(todayISO, -180));

  // Perfil completo, agrupado.
  const age = profile.birthdate ? Math.floor(DateTime.now().diff(DateTime.fromJSDate(profile.birthdate), 'years').years) : null;
  const row = (label: string, value: string | number | null | undefined) =>
    value === null || value === undefined || value === '' ? null : { label, value: String(value) };
  const rows = (...items: Array<{ label: string; value: string } | null>) => items.filter((x): x is { label: string; value: string } => !!x);
  const join = (v: unknown) => asList(v).join(', ');
  const facts: FactSection[] = [
    {
      title: 'Datos personales',
      rows: rows(
        row('Nombre', profile.name),
        row('Sexo', profile.sex ? (SEX_LABEL[profile.sex] ?? profile.sex) : null),
        row('Edad', age != null ? `${age} años` : null),
        row('Fecha de nacimiento', profile.birthdate ? isoOf(profile.birthdate) : null),
        row('Altura', profile.heightCm != null ? `${profile.heightCm} cm` : null),
        row('En Forza AI desde', profile.createdAt.toLocaleDateString('es-AR')),
        row('Zona horaria', profile.timezone),
      ),
    },
    {
      title: 'Objetivo y entrenamiento',
      rows: rows(
        row('Objetivo principal', profile.primaryGoal ? (GOAL_LABEL[profile.primaryGoal] ?? profile.primaryGoal) : null),
        row('Experiencia', profile.experienceLevel ? (EXPERIENCE_LABEL[profile.experienceLevel] ?? profile.experienceLevel) : null),
        row('Experiencia (nota)', profile.trainingExperienceNote),
        row('Dónde entrena', profile.trainingPlace ? (PLACE[profile.trainingPlace] ?? profile.trainingPlace) : null),
        row('Días por semana', profile.daysAvailable),
        row('Minutos por sesión', profile.sessionMinutes),
        row('Nivel de actividad diaria', profile.activityLevel ? (ACTIVITY[profile.activityLevel] ?? profile.activityLevel) : null),
        row('Equipamiento', join(profile.equipment)),
        row('Músculos prioritarios', join(profile.musclePriorities)),
        row('Ejercicios que evita', join(profile.dislikedExercises)),
        row('Estilo de rutina', profile.routineStyle),
        row('Prioridad deportiva', profile.sportPriority),
        row('Lesiones o limitaciones', profile.injuries),
      ),
    },
    {
      title: 'Alimentación',
      rows: rows(
        row('Comidas por día', profile.mealsPerDay),
        row('Preferencias', join(profile.dietaryPrefs)),
        row('Alimentos que excluye', join(profile.excludedFoods)),
        row('Alergias', join(profile.allergies)),
      ),
    },
  ].filter((s) => s.rows.length > 0);

  const coachingLines = (await buildCoachProfileLines(profile)).map((l) => l.trim());
  const sportLines = (await buildSportContextLines(profile)).map((l) => l.replace(/^\s+/, '• ').trim());

  // Secuencial: el pool de conexiones es chico.
  const records = await db.personalRecord.findMany({
    orderBy: { achievedAt: 'desc' },
    take: 12,
    select: { type: true, value: true, unit: true, achievedAt: true, exercise: { select: { name: true } } },
  });
  const steps = await db.dailyActivity.findMany({
    where: { date: { gte: since14 } },
    orderBy: { date: 'desc' },
    select: { date: true, steps: true, activeMinutes: true },
  });
  const workouts = await db.workout.findMany({
    where: { status: 'COMPLETED' },
    orderBy: { finishedAt: 'desc' },
    take: 20,
    select: {
      name: true,
      finishedAt: true,
      durationSeconds: true,
      perceivedEffort: true,
      notes: true,
      exercises: {
        orderBy: { orderIndex: 'asc' },
        select: {
          exercise: { select: { name: true } },
          sets: { where: { isCompleted: true, isWarmup: false }, select: { weightKg: true, reps: true } },
        },
      },
    },
  });
  const food = await db.foodEntry.findMany({
    where: { date: { gte: since14 } },
    orderBy: [{ date: 'desc' }, { mealType: 'asc' }, { position: 'asc' }],
    select: { date: true, mealType: true, customName: true, quantity: true, unit: true, kcal: true, proteinG: true, carbsG: true, fatG: true, food: { select: { name: true } } },
  });
  const weights = await db.weightEntry.findMany({
    where: { date: { gte: since180 } },
    orderBy: { date: 'asc' },
    select: { date: true, weightKg: true, note: true },
  });

  const byDay = new Map<string, { kcal: number; proteinG: number; carbsG: number; fatG: number }>();
  for (const e of food) {
    const k = isoOf(e.date);
    const c = byDay.get(k) ?? { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    byDay.set(k, { kcal: c.kcal + e.kcal, proteinG: c.proteinG + e.proteinG, carbsG: c.carbsG + e.carbsG, fatG: c.fatG + e.fatG });
  }

  return {
    facts,
    coachingLines,
    sportLines,
    records: records.map((r) => ({
      exercise: r.exercise.name,
      type: PR_TYPE[r.type] ?? r.type,
      value: r.value,
      unit: r.unit,
      date: isoOf(r.achievedAt),
    })),
    steps: steps.map((s) => ({ date: isoOf(s.date), steps: s.steps, activeMinutes: s.activeMinutes })),
    workouts: workouts.map((w) => ({
      name: w.name,
      date: w.finishedAt ? (DateTime.fromJSDate(w.finishedAt, { zone: 'utc' }).setZone(timezone).toISODate() ?? isoOf(w.finishedAt)) : '',
      minutes: w.durationSeconds ? Math.round(w.durationSeconds / 60) : null,
      effort: w.perceivedEffort ?? null,
      notes: w.notes ?? null,
      exercises: w.exercises.map((e) => {
        // La mejor serie: el mayor peso (y, a igual peso, más repeticiones).
        const best = e.sets
          .filter((s) => s.reps != null)
          .sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
        return {
          name: e.exercise.name,
          sets: e.sets.length,
          best: best ? `${best.weightKg != null ? `${best.weightKg} kg × ` : ''}${best.reps}` : null,
        };
      }),
    })),
    nutritionDays: [...byDay.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, v]) => ({
        date,
        kcal: Math.round(v.kcal),
        proteinG: Math.round(v.proteinG),
        carbsG: Math.round(v.carbsG),
        fatG: Math.round(v.fatG),
      })),
    todayMeals: food
      .filter((e) => isoOf(e.date) === todayISO)
      .map((e) => ({
        meal: MEAL[e.mealType] ?? e.mealType,
        name: e.customName ?? e.food?.name ?? 'Sin nombre',
        quantity: `${Math.round(e.quantity * 10) / 10} ${e.unit}`,
        kcal: Math.round(e.kcal),
      })),
    weights: weights.map((w) => ({ date: isoOf(w.date), weightKg: w.weightKg, note: w.note ?? null })),
  };
}
