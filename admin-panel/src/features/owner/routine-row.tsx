'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { countExercises, levelLabel } from '@/features/gym/routines';
import type { RoutineRow as Row } from '@/server/gym-routines';
import { deleteRoutineAction, setRoutineActiveAction } from './brand-actions';

/** Una rutina de la lista: editar, mostrar u ocultar a los socios, o borrar. */
export function RoutineRow({ r }: { r: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const level = levelLabel(r.level);

  return (
    <li className="space-y-2 px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{r.title}</p>
          <p className="text-xs text-muted-foreground">
            {r.days.length} {r.days.length === 1 ? 'día' : 'días'} · {countExercises(r.days)} ejercicios{level ? ` · ${level}` : ''}
          </p>
        </div>
        <Badge variant={r.active ? 'success' : 'secondary'}>{r.active ? 'La ven tus socios' : 'Oculta'}</Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/gym/rutinas/${r.id}`}>Editar</Link>
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setRoutineActiveAction({ id: r.id, active: !r.active });
              if (res.ok) router.refresh();
              else toast.error('No se pudo cambiar. Probá de nuevo.');
            })
          }
        >
          {r.active ? 'Ocultar' : 'Mostrar a mis socios'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (!confirm(`¿Borrar la rutina "${r.title}"? Tus socios dejan de verla.`)) return;
            start(async () => {
              const res = await deleteRoutineAction({ id: r.id });
              if (res.ok) router.refresh();
              else toast.error('No se pudo borrar. Probá de nuevo.');
            });
          }}
        >
          Borrar
        </Button>
      </div>
    </li>
  );
}
