'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addGymClients } from './client-actions';
import { parseClientLines } from './fees';

/** Cargar clientes: se pega una lista, una por línea. Sólo el nombre es obligatorio. */
export function AddClientsForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const parsed = parseClientLines(text);

  function submit() {
    start(async () => {
      const res = await addGymClients({ text });
      if (res.ok && res.data) {
        const { added, skipped, invalid } = res.data;
        toast.success(added > 0 ? `${added} ${added === 1 ? 'cliente cargado' : 'clientes cargados'}.` : 'No había clientes nuevos.');
        if (skipped > 0) toast.message(`${skipped} ya estaban cargados por su mail.`);
        if (invalid.length > 0) toast.warning(`No se entendieron ${invalid.length}: ${invalid[0]?.slice(0, 40)}…`);
        if (added > 0) setText('');
        router.refresh();
      } else if (res.error === 'TOO_MANY') toast.error('Son demasiados juntos: cargalos de a 500.');
      else toast.error('No se pudo cargar. Probá de nuevo.');
    });
  }

  return (
    <details open={defaultOpen} className="rounded-xl border">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">+ Cargar clientes</summary>
      <div className="space-y-3 border-t p-4">
        <label className="block space-y-1">
          <span className="block text-xs text-muted-foreground">
            Un cliente por línea: <span className="font-mono">Nombre, mail, teléfono, cuota, vencimiento</span>. Solo el nombre es obligatorio; lo demás puede faltar. El vencimiento es el día que le toca pagar (por ejemplo 20/11/2026).
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            disabled={pending}
            placeholder={'Ana Pérez, ana@gmail.com, 11 5555-1234, 25000, 20/11/2026\nLuis Gómez, luis@gmail.com\nMarta Ruiz'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {parsed.valid.length} {parsed.valid.length === 1 ? 'cliente' : 'clientes'} para cargar{parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} sin entender` : ''}
          </span>
          <Button disabled={pending || parsed.valid.length === 0} onClick={submit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Cargar
          </Button>
        </div>
      </div>
    </details>
  );
}
