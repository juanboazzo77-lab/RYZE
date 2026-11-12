'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';

const KEY = 'forza:gym-messages-dismissed';

function readDismissed(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Ventana de avisos del gimnasio en la pantalla principal: muestra los mensajes vigentes (los que el dueño mandó a todos
 * sus clientes). Cada uno se puede cerrar con "Entendido" y, cuando vence o el dueño lo saca, ya no llega. Si no hay
 * ninguno, no se muestra nada.
 */
export function GymMessages({ gymName, messages }: { gymName: string; messages: { id: string; title: string; body: string }[] }) {
  const [dismissed, setDismissed] = useState<string[] | null>(null);
  useEffect(() => setDismissed(readDismissed()), []);

  // Hasta que se lee lo que ya cerró la persona no se muestra nada, así no parpadea un aviso que ya cerró.
  if (dismissed === null) return null;
  const visible = messages.filter((m) => !dismissed.includes(m.id));
  if (visible.length === 0) return null;

  function close(id: string) {
    // Se guardan solo los ids que siguen vigentes, para que la lista no crezca.
    const next = [...readDismissed().filter((x) => messages.some((m) => m.id === x)), id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento: se cierra igual hasta que se recargue */
    }
    setDismissed(next);
  }

  return (
    <div className="space-y-2" role="region" aria-label={`Avisos de ${gymName}`}>
      {visible.map((m) => (
        <div key={m.id} className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Megaphone className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-primary">Aviso de {gymName}</p>
              <p className="font-semibold">{m.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{m.body}</p>
            </div>
            <button type="button" onClick={() => close(m.id)} aria-label="Cerrar aviso" className="-m-1 shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={() => close(m.id)} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
              Entendido
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
