'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CANCEL_BEFORE_MINUTES, WEEKDAYS } from '@/features/gym/classes';
import { createClassAction } from './class-actions';

const ERRORS: Record<string, string> = {
  NAME: 'Poné un nombre para la clase.',
  WEEKDAYS: 'Elegí al menos un día de la semana.',
  TIME: 'Poné la hora de inicio, por ejemplo 19:00.',
  DURATION: 'La duración tiene que estar entre 15 y 180 minutos.',
  CAPACITY: 'El cupo tiene que estar entre 1 y 200 personas.',
  TOO_MANY: 'Llegaste al máximo de clases. Borrá alguna que no uses.',
  NOT_OWNER: 'Tu gimnasio todavía no está aprobado.',
};

/** Armar una clase semanal: nombre, días, hora, duración y cupo. Se crea una por cada día elegido. */
export function ClassForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState('19:00');
  const [duration, setDuration] = useState('60');
  const [capacity, setCapacity] = useState('15');

  const toggle = (n: number) => setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n]));

  function create() {
    start(async () => {
      const res = await createClassAction({ name, instructor, description, weekdays: days, startTime: time, durationMin: Number(duration), capacity: Number(capacity) });
      if (res.ok) {
        toast.success('Clase creada. Tus socios ya pueden reservar.');
        setName('');
        setInstructor('');
        setDescription('');
        setDays([]);
        router.refresh();
      } else toast.error(ERRORS[res.error ?? ''] ?? 'No se pudo crear. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="font-semibold">Nueva clase</p>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Nombre</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Funcional, Spinning, Yoga..." />
      </label>
      <div className="space-y-1">
        <span className="text-sm text-muted-foreground">Qué días de la semana</span>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w) => (
            <button
              key={w.n}
              type="button"
              onClick={() => toggle(w.n)}
              aria-pressed={days.includes(w.n)}
              className={`h-9 rounded-full border px-3 text-sm transition-colors ${days.includes(w.n) ? 'border-primary bg-primary font-medium text-primary-foreground' : 'bg-background hover:bg-secondary'}`}
            >
              {w.short}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Hora</span>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Dura (min)</span>
          <Input inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Cupo</span>
          <Input inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Profe (opcional)</span>
        <Input value={instructor} onChange={(e) => setInstructor(e.target.value)} maxLength={60} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Descripción (opcional)</span>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="Traer toalla y agua" />
      </label>
      <p className="text-xs text-muted-foreground">
        Se repite todas las semanas. Tus socios reservan hasta con 7 días de anticipación y pueden cancelar hasta {CANCEL_BEFORE_MINUTES / 60} horas antes. Los horarios son de Argentina.
      </p>
      <Button disabled={pending || name.trim().length < 2 || days.length === 0} onClick={create}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Crear clase
      </Button>
    </div>
  );
}
