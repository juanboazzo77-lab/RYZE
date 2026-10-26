'use client';

import { useEffect, useState } from 'react';
import { Check, Pause, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { exerciseMedia } from './exercise-media';

const FRAME_MS = 900;

/**
 * Demostración del ejercicio: las dos fotos (inicio y final del movimiento) se alternan con un
 * fundido, como una animación corta. Un toque la pausa. Si el sistema pide menos movimiento,
 * arranca pausada. No muestra nada si el ejercicio no tiene demostración.
 */
export function ExerciseDemo({ name, className }: { name: string; className?: string }) {
  const t = useT();
  const media = exerciseMedia(name);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
    } catch {
      // seguir con la animación
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), FRAME_MS);
    return () => clearInterval(h);
  }, [playing]);

  if (!media) return null;

  return (
    <button
      type="button"
      onClick={() => setPlaying((p) => !p)}
      aria-label={playing ? t.training.guide.demoPause : t.training.guide.demoPlay}
      className={cn(
        'group relative block aspect-[3/2] w-full overflow-hidden rounded-lg bg-secondary',
        className,
      )}
    >
      {media.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={i === 0 ? name : ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            'absolute inset-0 size-full object-contain transition-opacity duration-300',
            frame === i ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-black/55 text-white opacity-80 transition-opacity group-hover:opacity-100">
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </span>
    </button>
  );
}

/**
 * Cabecera de un ejercicio en el entrenamiento: la primera foto de la demostración como miniatura
 * (un toque abre la animación) o, si no hay demostración, el número del ejercicio. Con todas las
 * series hechas se marca con un tilde.
 */
export function ExerciseThumb({
  name,
  index,
  done,
}: {
  name: string;
  index: number;
  done: boolean;
}) {
  const t = useT();
  const media = exerciseMedia(name);

  if (!media) {
    return (
      <span
        className={cn(
          'grid size-14 shrink-0 place-items-center rounded-xl text-lg font-extrabold tabular-nums',
          done ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground',
        )}
      >
        {done ? <Check className="size-6" strokeWidth={3} /> : index + 1}
      </span>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`${t.training.guide.demo}: ${name}`}
          className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-secondary"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media[0]} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover" />
          <span
            className={cn(
              'absolute bottom-0.5 right-0.5 grid size-5 place-items-center rounded-full text-white',
              done ? 'bg-success' : 'bg-black/60',
            )}
          >
            {done ? <Check className="size-3.5" strokeWidth={3} /> : <Play className="size-3 fill-current" />}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <ExerciseDemo name={name} />
        <p className="text-center text-xs text-muted-foreground">{t.training.guide.demoHint}</p>
      </DialogContent>
    </Dialog>
  );
}
