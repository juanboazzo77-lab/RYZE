import { DateTime } from 'luxon';
import { overviewDays, type OverviewDay } from '@/features/training/overview';
import { localTodayISO, weekStartISO } from '@/lib/date';
import type { TrainingPlan, Training } from './data';

/**
 * La semana de entrenamiento calculada EN EL TELÉFONO con lo guardado, a la hora de ahora. Así, aunque no haya señal,
 * "hoy te toca" cambia con el día y lo completado se reinicia al empezar la semana siguiente.
 */
export function weekFromTraining(
  plan: TrainingPlan,
  recent: Training['recentWorkouts'],
  profile: { timezone: string; weekStart: number },
  now: Date,
): { days: OverviewDay[]; todayWeekday: number } {
  const local = DateTime.fromJSDate(now).setZone(profile.timezone);
  const days = overviewDays(
    {
      weekShift: plan.weekShift,
      weekShiftStart: plan.weekShiftStart ? new Date(`${plan.weekShiftStart}T00:00:00.000Z`) : null,
      days: plan.days.map((d) => ({ id: d.id, name: d.name, weekday: d.weekday, exerciseCount: d.exercises.length })),
    },
    recent.map((w) => ({ planDayId: w.planDayId, finishedAt: new Date(w.finishedAt) })),
    profile.timezone,
    weekStartISO(localTodayISO(profile.timezone, local), profile.weekStart),
  );
  return { days, todayWeekday: local.weekday };
}
