'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { MAX_DAYS, MAX_EXERCISES_PER_DAY, ROUTINE_LEVELS, type RoutineDay, type RoutineExercise } from '@/features/gym/routines';
import { saveRoutineAction } from './brand-actions';

const blankExercise = (): RoutineExercise => ({ name: '', sets: '', reps: '', note: '' });
const blankDay = (n: number): RoutineDay => ({ name: `Día ${n}`, exercises: [blankExercise()] });

/** Armar o editar una rutina oficial del gimnasio: días, y en cada día sus ejercicios con series y repeticiones. */
export function RoutineEditor(props: { id: string | null; title: string; description: string; level: string | null; days: RoutineDay[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description);
  const [level, setLevel] = useState(props.level ?? '');
  const [days, setDays] = useState<RoutineDay[]>(props.days.length > 0 ? props.days : [blankDay(1)]);

  const setDay = (i: number, patch: Partial<RoutineDay>) => setDays((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const setEx = (i: number, j: number, patch: Partial<RoutineExercise>) =>
    setDays((ds) => ds.map((d, k) => (k === i ? { ...d, exercises: d.exercises.map((e, m) => (m === j ? { ...e, ...patch } : e)) } : d)));

  function save() {
    start(async () => {
      const res = await saveRoutineAction({ id: props.id, title, description, level: level || null, days });
      if (res.ok) {
        toast.success('Rutina guardada.');
        router.push('/gym/rutinas');
        router.refresh();
      } else if (res.error === 'TOO_MANY') toast.error('Llegaste al máximo de rutinas. Borrá alguna que no uses.');
      else toast.error('Poné un título y al menos un ejercicio con nombre.');
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border p-4">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Nombre de la rutina</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Fuerza 3 días por semana" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Descripción (opcional)</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} placeholder="Para quien recién empieza, 3 veces por semana" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Nivel</span>
          <NativeSelect value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">Para todos</option>
            {ROUTINE_LEVELS.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>

      {days.map((d, i) => (
        <div key={i} className="space-y-3 rounded-xl border p-4">
          <div className="flex items-center gap-2">
            <Input value={d.name} onChange={(e) => setDay(i, { name: e.target.value })} maxLength={60} aria-label={`Nombre del día ${i + 1}`} className="font-semibold" />
            {days.length > 1 ? (
              <Button variant="ghost" size="icon" aria-label="Quitar este día" onClick={() => setDays((ds) => ds.filter((_, k) => k !== i))}>
                <Trash2 className="size-4" />
              </Button>
            ) : null}
          </div>

          <div className="space-y-2">
            {d.exercises.map((e, j) => (
              <div key={j} className="grid grid-cols-[1fr_4.5rem_5.5rem_auto] items-center gap-2">
                <Input value={e.name} onChange={(ev) => setEx(i, j, { name: ev.target.value })} maxLength={80} placeholder="Ejercicio" aria-label="Ejercicio" />
                <Input value={e.sets} onChange={(ev) => setEx(i, j, { sets: ev.target.value })} maxLength={12} placeholder="Series" aria-label="Series" inputMode="numeric" />
                <Input value={e.reps} onChange={(ev) => setEx(i, j, { reps: ev.target.value })} maxLength={24} placeholder="Reps" aria-label="Repeticiones" />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar ejercicio"
                  onClick={() => setDay(i, { exercises: d.exercises.length > 1 ? d.exercises.filter((_, m) => m !== j) : [blankExercise()] })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          {d.exercises.length < MAX_EXERCISES_PER_DAY ? (
            <Button variant="outline" size="sm" onClick={() => setDay(i, { exercises: [...d.exercises, blankExercise()] })}>
              <Plus className="size-4" />
              Agregar ejercicio
            </Button>
          ) : null}
        </div>
      ))}

      {days.length < MAX_DAYS ? (
        <Button variant="outline" onClick={() => setDays((ds) => [...ds, blankDay(ds.length + 1)])}>
          <Plus className="size-4" />
          Agregar día
        </Button>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button disabled={pending} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar rutina
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => router.push('/gym/rutinas')}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
