'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import type { Dictionary } from '@/i18n';
import { MUSCLE_GROUPS } from './muscles';
import type { MuscleGroup } from '@prisma/client';
import { cn } from '@/lib/utils';
import type { ExerciseResult } from '@/server/training/exercise-search';
import { createExercise, searchExercisesAction } from './actions';

export function ExercisePicker({
  onPick,
  children,
}: {
  onPick: (exerciseId: string, name: string) => void | Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="gap-3">
        <Body
          onPick={async (id, name) => {
            await onPick(id, name);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Body({ onPick }: { onPick: (id: string, name: string) => void | Promise<void> }) {
  const t = useT();
  const tp = t.training.picker;
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [creating, setCreating] = useState(false);
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    const h = setTimeout(() => {
      startSearch(async () => {
        try {
          setResults(await searchExercisesAction(q.trim(), muscle ?? undefined));
        } catch {
          setResults([]);
        }
      });
    }, 250);
    return () => clearTimeout(h);
  }, [q, muscle]);

  const groups = MUSCLE_GROUPS.map(
    (g) => [g, results.filter((r) => r.primaryMuscle === g)] as const,
  ).filter(([, items]) => items.length > 0);

  if (creating) {
    return <CreateForm t={t} defaultName={q.trim()} onDone={onPick} onCancel={() => setCreating(false)} />;
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tp.title}</DialogTitle>
      </DialogHeader>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tp.searchPlaceholder}
          className="pl-9"
        />
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {[null, ...MUSCLE_GROUPS].map((m) => (
          <button
            key={m ?? 'all'}
            type="button"
            onClick={() => setMuscle(m)}
            aria-pressed={muscle === m}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              muscle === m
                ? 'border-primary bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary/50',
            )}
          >
            {m ? t.training.muscles[m] : tp.all}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {searching && results.length === 0 ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{tp.createHint}</p>
        ) : (
          <div className={cn(searching && 'opacity-60')}>
            {groups.map(([group, items]) => (
              <section key={group}>
                {!muscle ? (
                  <h3 className="sticky top-0 z-10 bg-background/95 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                    {t.training.muscles[group]}
                  </h3>
                ) : null}
                <ul className="divide-y">
                  {items.map((ex) => (
                    <li key={ex.id}>
                      <button
                        onClick={() => onPick(ex.id, ex.name)}
                        className="flex w-full items-center justify-between gap-3 py-2.5 text-left hover:bg-secondary/50"
                      >
                        <span className="text-sm font-medium">{ex.name}</span>
                        {ex.equipment ? (
                          <span className="text-xs text-muted-foreground">{ex.equipment}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <Button variant="outline" onClick={() => setCreating(true)}>
        <Plus className="size-4" />
        {tp.createTitle}
      </Button>
    </>
  );
}

function CreateForm({
  t,
  defaultName,
  onDone,
  onCancel,
}: {
  t: Dictionary;
  defaultName: string;
  onDone: (id: string, name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const tp = t.training.picker;
  const [name, setName] = useState(defaultName);
  const [type, setType] = useState<'STRENGTH' | 'CARDIO'>('STRENGTH');
  const [muscle, setMuscle] = useState<(typeof MUSCLE_GROUPS)[number]>('CHEST');
  const [pending, start] = useTransition();

  function submit() {
    if (name.trim().length < 2) return;
    start(async () => {
      const res = await createExercise({
        name: name.trim(),
        type,
        primaryMuscle: type === 'CARDIO' ? 'OTHER' : muscle,
      });
      if (res.ok && res.data) {
        toast.success(t.training.toast.exerciseAdded);
        await onDone(res.data.id, name.trim());
      } else {
        toast.error(t.training.toast.genericError);
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{tp.createTitle}</DialogTitle>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label>{tp.createName}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>{t.training.fields.type}</Label>
        <NativeSelect
          value={type}
          onChange={(e) => setType(e.target.value as 'STRENGTH' | 'CARDIO')}
        >
          <option value="STRENGTH">{t.training.fields.strength}</option>
          <option value="CARDIO">{t.training.fields.cardio}</option>
        </NativeSelect>
      </div>
      {type === 'STRENGTH' ? (
        <div className="space-y-1.5">
          <Label>{t.training.fields.muscle}</Label>
          <NativeSelect
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as (typeof MUSCLE_GROUPS)[number])}
          >
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {t.training.muscles[m]}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button onClick={submit} className="flex-1" disabled={pending || name.trim().length < 2}>
          {tp.create}
        </Button>
      </div>
    </>
  );
}
