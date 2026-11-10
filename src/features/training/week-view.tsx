import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import type { Dictionary } from '@/i18n';
import type { OverviewDay } from './queries';
import { pickHeroDay } from './today-pick';
import { StartWorkoutButton } from './start-button';
import { ShiftDaysControls } from './shift-days';

/**
 * La semana de entrenamiento: arriba lo que toca hoy (o lo próximo), grande y con un solo botón, y abajo todos
 * los días de la rutina como tarjetas. Es solo presentación: recibe los datos ya armados.
 */
export function WeekView({
  plan,
  t,
  todayWeekday,
  showHero,
}: {
  plan: { id: string; name: string; days: OverviewDay[] };
  t: Dictionary;
  todayWeekday: number;
  showHero: boolean;
}) {
  const hero = pickHeroDay(plan.days, todayWeekday);
  const weekdayName = (n: number | null) => (n ? t.training.weekdays[String(n) as '1'] : null);
  // Si el nombre del día ya empieza con el día de la semana ("Lunes - Empuje"), no se repite en la etiqueta.
  const extraWeekday = (d: OverviewDay) => {
    const w = weekdayName(d.weekday);
    return w && !d.name.toLowerCase().startsWith(w.toLowerCase()) ? w : null;
  };
  const totalExercises = plan.days.reduce((n, d) => n + d.exerciseCount, 0);

  return (
    <>
      {hero && showHero ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/60 p-5 text-primary-foreground shadow-lg">
          <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-8 size-28 rounded-full bg-white/10" />
          <Dumbbell aria-hidden="true" className="absolute right-5 top-5 size-7 opacity-30" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{hero.isToday ? t.training.heroToday : t.training.heroNext}</p>
            <p className="mt-1.5 text-2xl font-extrabold leading-tight">{hero.day.name}</p>
            <p className="mt-1 text-sm opacity-90">
              {[extraWeekday(hero.day), `${hero.day.exerciseCount} ${t.training.exercises}`].filter(Boolean).join(' · ')}
            </p>
            <StartWorkoutButton
              planDayId={hero.day.id}
              label={t.training.start}
              className="mt-4 h-12 w-full rounded-full bg-white text-base font-bold text-primary shadow-sm hover:bg-white/90"
            />
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.training.yourWeek}</p>
            <h2 className="mt-0.5 text-lg font-bold leading-snug">{plan.name}</h2>
            <p className="text-xs text-muted-foreground">
              {plan.days.length} {t.training.days} · {totalExercises} {t.training.exercises}
            </p>
          </div>
          <Link
            href={`/training/plans/${plan.id}`}
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {t.common.edit}
          </Link>
        </div>

        {plan.days.length === 0 ? (
          <p className="rounded-2xl border p-4 text-sm text-muted-foreground">{t.training.emptyDays}</p>
        ) : (
          <ul className="space-y-2.5">
            {plan.days.map((d, i) => {
              const isHero = hero?.day.id === d.id && hero.isToday;
              return (
                <li key={d.id} className={`flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-colors ${isHero ? 'border-primary/60 bg-accent' : ''}`}>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-base font-extrabold ${isHero ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary'}`}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold leading-snug">{d.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {extraWeekday(d) ? <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-secondary-foreground">{extraWeekday(d)}</span> : null}
                      <span>
                        {d.exerciseCount} {t.training.exercises}
                      </span>
                    </div>
                  </div>
                  <StartWorkoutButton planDayId={d.id} label="" ariaLabel={`${t.training.start}: ${d.name}`} className="size-11 shrink-0 rounded-full p-0" />
                </li>
              );
            })}
          </ul>
        )}

        {plan.days.some((d) => d.weekday) ? <ShiftDaysControls /> : null}
      </section>
    </>
  );
}
