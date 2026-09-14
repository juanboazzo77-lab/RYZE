import 'server-only';
import type { Entitlement, Profile } from '@prisma/client';
import { DateTime } from 'luxon';
import { forUser } from '@/server/user-db';
import { can } from '@/server/entitlements';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { weeklyWeightChangeKg, type DatedWeight } from '@/features/dashboard/compute';
import { buildSportContextLines } from '@/features/sports/queries';
import { buildCoachProfileLines } from '@/features/coach-profile/queries';

/** Edad en años a partir de la fecha de nacimiento. */
function ageFrom(birthdate: Date | null): number | null {
  if (!birthdate) return null;
  return Math.floor(DateTime.now().diff(DateTime.fromJSDate(birthdate), 'years').years);
}

function asList(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(', ') || '—';
  return '—';
}

/**
 * Snapshot compacto del usuario para el AI Coach / generador de planes.
 * Una sola query (connection_limit=15). Devuelve texto plano para el prompt.
 */
export async function buildUserContextBlock(
  profile: Profile,
  entitlement: Pick<Entitlement, 'tier'>,
): Promise<string> {
  const db = forUser(profile.id);
  const tz = profile.timezone;
  const todayISO = localTodayISO(tz);
  const todayDate = isoToUtcDate(todayISO);
  const since30 = isoToUtcDate(addDaysISO(todayISO, -30));

  const [goal, target, todayEntries, weights, plan, recentWorkouts, prs, checkins] =
    await db.$transaction([
    db.goal.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } }),
    db.nutritionTarget.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
    db.foodEntry.findMany({
      where: { date: todayDate },
      select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
    }),
    db.weightEntry.findMany({
      where: { date: { gte: since30 } },
      orderBy: { date: 'asc' },
      select: { date: true, weightKg: true },
    }),
    db.workoutPlan.findFirst({
      where: { isActive: true },
      select: {
        name: true,
        days: {
          orderBy: { orderIndex: 'asc' },
          select: {
            name: true,
            weekday: true,
            exercises: {
              orderBy: { orderIndex: 'asc' },
              select: {
                targetSets: true,
                targetRepsMin: true,
                targetRepsMax: true,
                exercise: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    db.workout.findMany({
      where: { status: 'COMPLETED', finishedAt: { gte: since30 } },
      orderBy: { finishedAt: 'desc' },
      take: 4,
      select: {
        name: true,
        finishedAt: true,
        durationSeconds: true,
        perceivedEffort: true,
        _count: { select: { exercises: true } },
      },
    }),
    db.personalRecord.findMany({
      orderBy: { achievedAt: 'desc' },
      take: 8,
      select: {
        type: true,
        value: true,
        unit: true,
        achievedAt: true,
        exercise: { select: { name: true } },
      },
    }),
    db.weeklyCheckin.findMany({
      orderBy: { weekStart: 'desc' },
      take: 3,
      select: { weekStart: true, aiSummary: true, aiProposal: true, status: true },
    }),
  ]);

  const consumed = todayEntries.reduce(
    (a, e) => ({
      kcal: a.kcal + e.kcal,
      p: a.p + e.proteinG,
      c: a.c + e.carbsG,
      f: a.f + e.fatG,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  );

  const dated: DatedWeight[] = weights.map((w) => ({
    date: w.date.toISOString().slice(0, 10),
    weightKg: w.weightKg,
  }));
  const currentKg = dated.at(-1)?.weightKg ?? null;
  const weeklyChange = weeklyWeightChangeKg(dated, todayISO, addDaysISO);
  const age = ageFrom(profile.birthdate);

  const lines: string[] = [];
  lines.push(`Fecha: ${todayISO} (${tz})`);
  lines.push(
    `Perfil: ${profile.name ?? 'sin nombre'}, ${profile.sex ?? '—'}, ${age ?? '—'} años, ` +
      `${profile.heightCm ?? '—'} cm, nivel ${profile.experienceLevel ?? '—'}, ` +
      `actividad ${profile.activityLevel ?? '—'}.`,
  );
  lines.push(
    `Entrenamiento: objetivo ${profile.primaryGoal ?? '—'}, ${profile.daysAvailable ?? '—'} días/sem, ` +
      `${profile.sessionMinutes ?? '—'} min/sesión, lugar ${profile.trainingPlace ?? '—'}, ` +
      `equipo: ${asList(profile.equipment)}.`,
  );
  lines.push(
    `Dieta: ${profile.mealsPerDay ?? '—'} comidas/día, preferencias: ${asList(profile.dietaryPrefs)}, ` +
      `excluye: ${asList(profile.excludedFoods)}, alergias: ${asList(profile.allergies)}.`,
  );
  if (profile.injuries) lines.push(`Lesiones/limitaciones: ${profile.injuries}`);

  const sportLines = await buildSportContextLines(profile);
  if (sportLines.length > 0) lines.push(...sportLines);

  // Individualización a partir del perfil de coaching: exclusiva del plan COACH.
  if (can(entitlement, 'coach_profile')) {
    const coachProfileLines = await buildCoachProfileLines(profile);
    if (coachProfileLines.length > 0) lines.push(...coachProfileLines);
  }

  if (goal) {
    lines.push(
      `Meta: ${goal.type}, de ${goal.startWeightKg ?? '—'} kg a ${goal.targetWeightKg ?? '—'} kg ` +
        `(${goal.weeklyRateKg ?? '—'} kg/sem).`,
    );
  }
  lines.push(
    currentKg !== null
      ? `Peso actual ${currentKg} kg; cambio semanal ${weeklyChange ?? '—'} kg (${dated.length} registros en 30 d).`
      : 'Sin registros de peso.',
  );

  if (target) {
    lines.push(
      `Objetivo nutricional: ${target.kcal} kcal · P ${target.proteinG} g · C ${target.carbsG} g · G ${target.fatG} g.`,
    );
  } else {
    lines.push('Sin objetivo nutricional definido.');
  }
  lines.push(
    `Consumido hoy: ${Math.round(consumed.kcal)} kcal · P ${Math.round(consumed.p)} g · ` +
      `C ${Math.round(consumed.c)} g · G ${Math.round(consumed.f)} g.`,
  );

  if (plan) {
    lines.push(`Plan activo: "${plan.name}" (${plan.days.length} días).`);
    for (const d of plan.days) {
      const names = d.exercises.map((e) => e.exercise.name).join(', ');
      lines.push(`  - ${d.name} (${d.exercises.length} ej.): ${names || '—'}`);
    }
  } else {
    lines.push('Sin plan de entrenamiento activo.');
  }

  if (recentWorkouts.length > 0) {
    lines.push('Últimos entrenos:');
    for (const w of recentWorkouts) {
      const when = w.finishedAt ? w.finishedAt.toISOString().slice(0, 10) : '—';
      const mins = w.durationSeconds ? Math.round(w.durationSeconds / 60) : '—';
      lines.push(
        `  - ${when}: ${w.name}, ${w._count.exercises} ej., ${mins} min` +
          (w.perceivedEffort ? `, esfuerzo ${w.perceivedEffort}/10` : ''),
      );
    }
  } else {
    lines.push('Sin entrenos completados en los últimos 30 días.');
  }

  if (prs.length > 0) {
    lines.push(
      'Récords recientes: ' +
        prs
          .map((p) => `${p.exercise.name} ${p.type} ${p.value}${p.unit}`)
          .join(' · '),
    );
  }

  if (checkins.length > 0) {
    lines.push('Revisiones semanales recientes:');
    for (const c of checkins) {
      const when = c.weekStart.toISOString().slice(0, 10);
      const prop = c.aiProposal as { kind?: string; to?: { kcal?: number } } | null;
      const decision =
        c.status === 'APPLIED' && prop?.to?.kcal
          ? `ajuste aplicado → ${prop.to.kcal} kcal`
          : prop?.kind === 'nutrition_targets'
            ? 'ajuste propuesto (no aplicado)'
            : 'sin cambios';
      lines.push(`  - ${when}: ${decision}. ${c.aiSummary ?? ''}`.trim());
    }
  }

  return lines.join('\n');
}
