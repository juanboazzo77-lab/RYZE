'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inviteMembers } from './actions';
import { parseEmailList } from './logic';

/** El dueño pega los mails de sus clientes. Quedan pendientes de aprobación: todavía no sale ningún mail. */
export function InviteForm({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const parsed = parseEmailList(text);

  function submit() {
    start(async () => {
      const res = await inviteMembers({ list: text });
      if (res.ok && res.data) {
        const { added, skipped, invalid } = res.data;
        toast.success(
          added > 0
            ? `${added} ${added === 1 ? 'pedido enviado' : 'pedidos enviados'} para aprobación.`
            : 'No había nada nuevo para pedir.',
        );
        if (skipped > 0) toast.message(`${skipped} ya estaban pedidos o adentro.`);
        if (invalid.length > 0) toast.warning(`No se entendieron: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`);
        if (added > 0) setText('');
        router.refresh();
      } else if (res.error === 'NOT_ACTIVE') toast.error('Tu gimnasio todavía no está aprobado.');
      else if (res.error === 'TOO_MANY') toast.error('Son demasiados mails juntos: cargalos de a 200.');
      else if (res.error === 'EMPTY') toast.error('No encontré ningún mail en lo que pegaste.');
      else toast.error('No se pudo enviar. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Mails de tus clientes</span>
        <span className="block text-xs text-muted-foreground">
          Pegá uno por línea, o separados por coma. Podés cargar hasta 200 juntos.
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          disabled={disabled || pending}
          placeholder={'ana@ejemplo.com\nluis@ejemplo.com'}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {parsed.valid.length} {parsed.valid.length === 1 ? 'mail' : 'mails'} válidos
          {parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} sin entender` : ''}
        </span>
        <Button disabled={disabled || pending || parsed.valid.length === 0} onClick={submit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Pedir el alta
        </Button>
      </div>
    </div>
  );
}
