'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { CHALLENGE_METRICS, metricInfo } from '@/features/gym/challenges';
import { createChallengeAction } from './challenge-actions';

const ERRORS: Record<string, string> = {
  TITLE: 'Poné un nombre para el reto.',
  DATES: 'Revisá las fechas: el final no puede ser antes del inicio.',
  TOO_LONG: 'El reto dura demasiado: hasta 120 días.',
  TOO_MANY: 'Ya tenés muchos retos abiertos. Borrá alguno o esperá a que termine.',
  PAST: 'Ese reto ya terminó: elegí fechas de hoy en adelante.',
  NOT_OWNER: 'Tu gimnasio todavía no está aprobado.',
};

/** Armar un reto: nombre, qué se cuenta, fechas y, si querés, un premio. */
export function ChallengeForm({ today, nextMonthEnd }: { today: string; nextMonthEnd: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [metric, setMetric] = useState('WORKOUTS');
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(nextMonthEnd);
  const [prize, setPrize] = useState('');

  function create() {
    start(async () => {
      const res = await createChallengeAction({ title, description, metric, startsOn, endsOn, prize });
      if (res.ok) {
        toast.success('Reto creado. Tus socios lo ven en la app.');
        setTitle('');
        setDescription('');
        setPrize('');
        router.refresh();
      } else toast.error(ERRORS[res.error ?? ''] ?? 'No se pudo crear. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="font-semibold">Nuevo reto</p>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Nombre</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Reto de noviembre: ¿quién entrena más?" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Descripción (opcional)</span>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} placeholder="Los 3 primeros se llevan un premio" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Qué se cuenta</span>
        <NativeSelect value={metric} onChange={(e) => setMetric(e.target.value)}>
          {CHALLENGE_METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </NativeSelect>
        <span className="block text-xs text-muted-foreground">{metricInfo(metric).help}</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Empieza</span>
          <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Termina</span>
          <Input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Premio (opcional)</span>
        <Input value={prize} onChange={(e) => setPrize(e.target.value)} maxLength={120} placeholder="Un mes de cuota gratis" />
        <span className="block text-xs text-muted-foreground">El premio lo entregás vos, el gimnasio.</span>
      </label>
      <Button disabled={pending || title.trim().length < 2} onClick={create}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Crear reto
      </Button>
    </div>
  );
}
