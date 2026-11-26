import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WEEK_BUTTONS, WeekLayout } from '@/features/training/week-layout';
import type { Dictionary } from '@/i18n';
import type { AppData, PlanExerciseRow, TrainingPlan } from '@/lib/sync/data';
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

export function Train({ t, data }: { t: Dictionary; data: AppData }) {
  const now = useNow();
  const [openDayId, setOpenDayId] = useState<string | null>(null);
  const training = data.training;
  const plan = training?.plan ?? null;
  const openDay = plan?.days.find((d) => d.id === openDayId) ?? null;

  // Con llaves a propósito: en navegadores nuevos `scrollTo` devuelve algo, y React lo tomaría como la función a
  // ejecutar al salir (rompía la app al cambiar de sección).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [openDayId]);

  if (openDay) return <DayDetail t={t} day={openDay} onBack={() => setOpenDayId(null)} />;

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
          showHero
          slots={{
            heroStart: (d) => (
              <Button className={WEEK_BUTTONS.heroStart} onClick={() => setOpenDayId(d.id)}>
                <Eye className="size-4" />
                Ver ejercicios
              </Button>
            ),
            heroRepeat: (d) => (
              <Button variant="ghost" className={WEEK_BUTTONS.heroRepeat} onClick={() => setOpenDayId(d.id)}>
                Ver ejercicios
              </Button>
            ),
            dayAction: (d) => (
              <Button
                variant={d.done ? 'outline' : 'default'}
                className={d.done ? WEEK_BUTTONS.dayDone : WEEK_BUTTONS.day}
                aria-label={`Ver ejercicios: ${d.name}`}
                onClick={() => setOpenDayId(d.id)}
              >
                <ChevronRight className="size-4" />
              </Button>
            ),
          }}
        />
      )}
    </>
  );
}

function target(t: Dictionary, e: PlanExerciseRow): string {
  const range = (a: number | null, b: number | null) => (a && b && a !== b ? `${a}–${b}` : String(a ?? b ?? ''));
  const parts = [`${e.targetSets} ${t.training.fields.sets.toLowerCase()}`];
  if (e.targetRepsMin || e.targetRepsMax) parts.push(`${range(e.targetRepsMin, e.targetRepsMax)} ${t.training.fields.reps.toLowerCase()}`);
  if (e.targetDurationSec) parts.push(e.targetDurationSec >= 60 ? `${Math.round(e.targetDurationSec / 60)} min` : `${e.targetDurationSec} s`);
  if (e.targetDistanceMeters) parts.push(`${e.targetDistanceMeters} m`);
  if (e.targetRir !== null) parts.push(`${t.training.fields.rir} ${e.targetRir}`);
  if (e.restSeconds) parts.push(`${e.restSeconds} s de descanso`);
  return parts.join(' · ');
}

function DayDetail({ t, day, onBack }: { t: Dictionary; day: TrainingPlan['days'][number]; onBack: () => void }) {
  const muscle = (m: string) => (t.training.muscles as Record<string, string>)[m] ?? m;
  return (
    <>
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-muted-foreground">
        <ArrowLeft className="size-4" />
        {t.training.title}
      </Button>
      <div>
        <h1 className="text-2xl font-extrabold leading-tight">{day.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {day.exercises.length} {t.training.exercises}
        </p>
      </div>
      <ul className="space-y-2.5">
        {day.exercises.map((e, i) => (
          <li key={e.id} className="flex gap-3 rounded-2xl border bg-card p-3 shadow-sm">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-sm font-extrabold text-primary">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-snug">{e.name}</p>
              <p className="text-xs font-medium text-primary">{muscle(e.primaryMuscle)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{target(t, e)}</p>
              {e.notes ? <p className="mt-1.5 whitespace-pre-line text-xs">{e.notes}</p> : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-center text-xs text-muted-foreground">Empezar y anotar el entrenamiento llega en el próximo paso.</p>
    </>
  );
}
