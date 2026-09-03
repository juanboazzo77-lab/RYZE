'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { NumberStepper } from '@/components/form/number-stepper';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { InlineText } from './inline-text';
import { ExercisePicker } from './exercise-picker';
import type { EditorDay, EditorExercise, PlanEditor } from './queries';
import {
  addPlanDay,
  addPlanExercise,
  deletePlan,
  deletePlanDay,
  deletePlanExercise,
  reorderPlanExercises,
  updatePlan,
  updatePlanDay,
  updatePlanExercise,
} from './actions';

interface LocalTarget {
  targetSets: number;
  repsMin: number;
  repsMax: number;
  rir: number | null;
  rest: number;
}

function toLocal(e: EditorExercise): LocalTarget {
  return {
    targetSets: e.targetSets,
    repsMin: e.targetRepsMin ?? 8,
    repsMax: e.targetRepsMax ?? 12,
    rir: e.targetRir,
    rest: e.restSeconds ?? 90,
  };
}

export function PlanEditorView({ plan }: { plan: PlanEditor }) {
  const t = useT();
  const router = useRouter();
  const [, startStruct] = useTransition();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <InlineText
          value={plan.name}
          className="text-2xl font-bold tracking-tight"
          inputClassName="text-xl font-bold h-10"
          onSave={(name) => startStruct(() => void updatePlan({ id: plan.id, name }))}
        />
        <div className="flex items-center gap-1">
          <Button
            variant={plan.isActive ? 'secondary' : 'outline'}
            size="sm"
            disabled={plan.isActive}
            onClick={() =>
              startStruct(async () => {
                await updatePlan({ id: plan.id, isActive: true });
                toast.success(t.training.toast.saved);
              })
            }
          >
            {plan.isActive ? (
              <>
                <Check className="size-4" />
                {t.training.active}
              </>
            ) : (
              t.training.setActive
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.training.deletePlan}
            onClick={() => {
              if (confirm(t.training.deletePlan + '?')) startStruct(() => void deletePlan({ id: plan.id }));
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {plan.days.map((day) => (
        <DayCard key={day.id} day={day} onChanged={() => router.refresh()} />
      ))}

      <AddDay planId={plan.id} />
    </div>
  );
}

function AddDay({ planId }: { planId: string }) {
  const t = useT();
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {t.training.addDay}
      </Button>
    );
  }
  return (
    <div className="flex gap-2">
      <input
        autoFocus
        value={name}
        placeholder={t.training.dayNamePh}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Button onClick={submit} disabled={pending || name.trim().length < 1}>
        {t.common.add}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        {t.common.cancel}
      </Button>
    </div>
  );

  function submit() {
    if (name.trim().length < 1) return;
    start(async () => {
      const res = await addPlanDay({ planId, name: name.trim() });
      if (res.ok) {
        setName('');
        setOpen(false);
        toast.success(t.training.toast.dayAdded);
      } else toast.error(t.training.toast.genericError);
    });
  }
}

function DayCard({ day, onChanged }: { day: EditorDay; onChanged: () => void }) {
  const t = useT();
  const [, start] = useTransition();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <InlineText
          value={day.name}
          className="font-semibold"
          onSave={(name) => start(() => void updatePlanDay({ id: day.id, name }))}
        />
        <div className="flex items-center gap-1">
          <NativeSelect
            value={day.weekday ?? ''}
            className="h-8 w-32 text-xs"
            onChange={(e) =>
              start(() =>
                void updatePlanDay({
                  id: day.id,
                  weekday: e.target.value ? Number(e.target.value) : null,
                }),
              )
            }
          >
            <option value="">{t.training.weekdayNone}</option>
            {([1, 2, 3, 4, 5, 6, 7] as const).map((n) => (
              <option key={n} value={n}>
                {t.training.weekdays[String(n) as '1']}
              </option>
            ))}
          </NativeSelect>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={t.training.deleteDay}
            onClick={() => {
              if (confirm(t.training.deleteDay + '?')) start(() => void deletePlanDay({ id: day.id }));
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {day.exercises.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">{t.training.emptyDays}</p>
        ) : (
          day.exercises.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              first={i === 0}
              last={i === day.exercises.length - 1}
              onMove={(dir) => {
                const ids = day.exercises.map((e) => e.id);
                const idx = i + dir;
                if (idx < 0 || idx >= ids.length) return;
                [ids[i], ids[idx]] = [ids[idx]!, ids[i]!];
                start(async () => {
                  await reorderPlanExercises({ planDayId: day.id, ids });
                  onChanged();
                });
              }}
            />
          ))
        )}
        <ExercisePicker
          onPick={(exerciseId) =>
            start(async () => {
              const res = await addPlanExercise({ planDayId: day.id, exerciseId });
              if (res.ok) toast.success(t.training.toast.exerciseAdded);
              else toast.error(t.training.toast.genericError);
            })
          }
        >
          <Button variant="secondary" size="sm">
            <Plus className="size-4" />
            {t.training.addExercise}
          </Button>
        </ExercisePicker>
      </CardContent>
    </Card>
  );
}

function ExerciseRow({
  ex,
  first,
  last,
  onMove,
}: {
  ex: EditorExercise;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const t = useT();
  const [v, setV] = useState<LocalTarget>(() => toLocal(ex));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function push(next: LocalTarget) {
    setV(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void updatePlanExercise({
        id: ex.id,
        targetSets: next.targetSets,
        targetRepsMin: next.repsMin,
        targetRepsMax: next.repsMax,
        targetRir: next.rir,
        restSeconds: next.rest,
      });
    }, 700);
  }

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{ex.name}</p>
          <Badge variant="secondary" className="mt-0.5">
            {t.training.muscles[ex.primaryMuscle]}
          </Badge>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="size-8" disabled={first} onClick={() => onMove(-1)}>
            <ArrowUp className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" disabled={last} onClick={() => onMove(1)}>
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={t.training.remove}
            onClick={() => void deletePlanExercise({ id: ex.id })}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <Metric label={t.training.fields.sets}>
          <NumberStepper value={v.targetSets} min={1} max={12} onChange={(x) => push({ ...v, targetSets: x })} />
        </Metric>
        <Metric label={t.training.fields.reps}>
          <div className="flex items-center gap-1">
            <NumberStepper value={v.repsMin} min={1} max={100} onChange={(x) => push({ ...v, repsMin: x })} />
            <span className="text-muted-foreground">–</span>
            <NumberStepper value={v.repsMax} min={1} max={100} onChange={(x) => push({ ...v, repsMax: x })} />
          </div>
        </Metric>
        <Metric label={t.training.fields.rir}>
          <NumberStepper
            value={v.rir ?? 0}
            min={0}
            max={10}
            onChange={(x) => push({ ...v, rir: x })}
          />
        </Metric>
        <Metric label={t.training.fields.rest}>
          <NumberStepper value={v.rest} min={0} max={600} step={15} onChange={(x) => push({ ...v, rest: x })} />
        </Metric>
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={cn('space-y-1')}>
      <span className="text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );
}
