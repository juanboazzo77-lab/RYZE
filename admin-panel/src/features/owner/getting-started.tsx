import Link from 'next/link';
import { Check, Circle } from 'lucide-react';

export interface StartStep {
  href: string;
  title: string;
  hint: string;
  done: boolean;
}

/**
 * "Primeros pasos" del Resumen: lo que le falta hacer a un gimnasio para empezar a usarlo. Desaparece cuando está
 * todo hecho, así el panel de un gimnasio que ya anda queda limpio.
 */
export function GettingStarted({ steps }: { steps: StartStep[] }) {
  const pending = steps.filter((s) => !s.done).length;
  if (pending === 0) return null;
  const done = steps.length - pending;
  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4" aria-label="Primeros pasos">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">Primeros pasos</h2>
        <p className="text-xs text-muted-foreground">
          {done} de {steps.length}
        </p>
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-background/70">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${s.done ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'}`}>
                {s.done ? <Check className="size-3" aria-hidden="true" /> : <Circle className="size-2" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${s.done ? 'text-muted-foreground line-through' : ''}`}>{s.title}</span>
                {s.done ? null : <span className="block text-xs text-muted-foreground">{s.hint}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
