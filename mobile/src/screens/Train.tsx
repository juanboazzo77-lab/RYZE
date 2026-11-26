import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WEEK_BUTTONS, WeekLayout } from '@/features/training/week-layout';
import type { Dictionary } from '@/i18n';
import type { AppData } from '@/lib/sync/data';
import { weekFromTraining } from '@/lib/sync/week';
import { Card } from '../ui';

/** La hora, actualizada al volver a la app y cada minuto: "hoy te toca" tiene que cambiar solo, aunque no haya señal. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

export function Train({
  t,
  data,
  hasActive,
  onPick,
}: {
  t: Dictionary;
  data: AppData;
  /** Hay un entrenamiento en curso: no se ofrece empezar otro arriba. */
  hasActive: boolean;
  onPick: (planDayId: string) => void;
}) {
  const now = useNow();
  const training = data.training;
  const plan = training?.plan ?? null;
  const week = plan && training ? weekFromTraining(plan, training.recentWorkouts, data.profile, now) : null;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">{t.training.title}</h1>
      {!training ? (
        <Card className="text-sm text-muted-foreground">Conectate a internet una vez para bajar tu rutina. Después la ves sin señal.</Card>
      ) : !plan || !week ? (
        <Card className="text-sm text-muted-foreground">{t.training.noPlans}</Card>
      ) : (
        <WeekLayout
          plan={{ id: plan.id, name: plan.name, days: week.days }}
          t={t}
          todayWeekday={week.todayWeekday}
          showHero={!hasActive}
          slots={{
            heroStart: (d) => (
              <Button className={WEEK_BUTTONS.heroStart} onClick={() => onPick(d.id)}>
                <Play className="size-4" />
                {t.training.start}
              </Button>
            ),
            heroRepeat: (d) => (
              <Button variant="ghost" className={WEEK_BUTTONS.heroRepeat} onClick={() => onPick(d.id)}>
                {t.training.repeat}
              </Button>
            ),
            dayAction: (d) => (
              <Button
                variant={d.done ? 'outline' : 'default'}
                className={d.done ? WEEK_BUTTONS.dayDone : WEEK_BUTTONS.day}
                aria-label={`${d.done ? t.training.repeat : t.training.start}: ${d.name}`}
                onClick={() => onPick(d.id)}
              >
                <Play className="size-4" />
              </Button>
            ),
          }}
        />
      )}
    </>
  );
}
