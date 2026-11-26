import Link from 'next/link';
import type { Dictionary } from '@/i18n';
import type { OverviewDay } from './overview';
import { WEEK_BUTTONS, WeekLayout } from './week-layout';
import { StartWorkoutButton } from './start-button';
import { ShiftDaysControls } from './shift-days';

/** La semana de entrenamiento en la web: el diseño es el de `WeekLayout` (compartido con la app) y acá van sus botones. */
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
  return (
    <WeekLayout
      plan={plan}
      t={t}
      todayWeekday={todayWeekday}
      showHero={showHero}
      slots={{
        heroStart: (d) => <StartWorkoutButton planDayId={d.id} label={t.training.start} className={WEEK_BUTTONS.heroStart} />,
        heroRepeat: (d) => (
          <StartWorkoutButton planDayId={d.id} label={t.training.repeat} variant="ghost" icon={false} className={WEEK_BUTTONS.heroRepeat} />
        ),
        dayAction: (d) =>
          d.done ? (
            // Hecho esta semana: el botón de empezar queda apagado (se puede repetir, pero ya no es "lo que toca").
            <StartWorkoutButton planDayId={d.id} label="" variant="outline" ariaLabel={`${t.training.repeat}: ${d.name}`} className={WEEK_BUTTONS.dayDone} />
          ) : (
            <StartWorkoutButton planDayId={d.id} label="" ariaLabel={`${t.training.start}: ${d.name}`} className={WEEK_BUTTONS.day} />
          ),
        edit: (
          <Link
            href={`/training/plans/${plan.id}`}
            className="shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {t.common.edit}
          </Link>
        ),
        footer: plan.days.some((d) => d.weekday) ? <ShiftDaysControls /> : null,
      }}
    />
  );
}
