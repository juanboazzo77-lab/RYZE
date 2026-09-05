'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/server/supabase/server';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

/**
 * Junta todos los datos del usuario en un solo objeto para exportar.
 * Sólo tablas propias del usuario (via forUser); nada de otras cuentas.
 */
export async function exportUserData(): Promise<Result<string>> {
  const { userId, profile } = await requireUser();
  const db = forUser(userId);

  const [
    goals,
    nutritionTargets,
    foodEntries,
    meals,
    workoutPlans,
    workouts,
    personalRecords,
    weightEntries,
    weeklyCheckins,
    userAchievements,
    notificationPreferences,
  ] = await db.$transaction([
    db.goal.findMany({ orderBy: { createdAt: 'asc' } }),
    db.nutritionTarget.findMany({ orderBy: { createdAt: 'asc' } }),
    db.foodEntry.findMany({ orderBy: { date: 'asc' } }),
    db.meal.findMany({ include: { items: true }, orderBy: { createdAt: 'asc' } }),
    db.workoutPlan.findMany({
      include: { days: { include: { exercises: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.workout.findMany({
      include: { exercises: { include: { sets: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    db.personalRecord.findMany({ orderBy: { achievedAt: 'asc' } }),
    db.weightEntry.findMany({ orderBy: { date: 'asc' } }),
    db.weeklyCheckin.findMany({ orderBy: { weekStart: 'asc' } }),
    db.userAchievement.findMany(),
    db.notificationPreference.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    profile,
    goals,
    nutritionTargets,
    foodEntries,
    meals,
    workoutPlans,
    workouts,
    personalRecords,
    weightEntries,
    weeklyCheckins,
    userAchievements,
    notificationPreferences,
  };

  return { ok: true, data: JSON.stringify(payload, null, 2) };
}

/**
 * Elimina la cuenta y todos sus datos (cascada desde auth.users -> profile ->
 * el resto de las tablas, ver prisma/schema.prisma). Irreversible.
 */
export async function deleteAccount(): Promise<never> {
  const { userId } = await requireUser();

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw new Error(`No se pudo eliminar la cuenta: ${error.message}`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login?deleted=1');
}
