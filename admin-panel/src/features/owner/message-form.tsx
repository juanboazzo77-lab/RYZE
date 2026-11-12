'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MESSAGE_DAYS, DEFAULT_MESSAGE_DAYS } from '@/features/gym/messages';
import { sendClientMessage } from './message-actions';

const ERRORS: Record<string, string> = {
  INVALID: 'Revisá el mensaje.',
  NOT_OWNER: 'No se pudo enviar.',
  TITLE: 'Poné un título (al menos 3 letras).',
  BODY: 'Escribí el mensaje.',
};

const dayLabel = (d: number) => (d === 1 ? '1 día' : `${d} días`);

/** Escribirle un aviso a todos los clientes conectados (feriados, cambios de horario, novedades). Para uno solo: WhatsApp desde su ficha. */
export function MessageForm({ connected }: { connected: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [days, setDays] = useState<number>(DEFAULT_MESSAGE_DAYS);

  function send() {
    if (!window.confirm(`¿Publicar este mensaje? Lo van a ver ${connected} ${connected === 1 ? 'cliente conectado' : 'clientes conectados'} en la pantalla principal de la app durante ${dayLabel(days)}.`)) return;
    start(async () => {
      const res = await sendClientMessage({ title, body, days });
      if ('ok' in res) {
        toast.success(res.notified > 0 ? `Mensaje publicado. Se avisa a ${res.notified} ${res.notified === 1 ? 'cliente' : 'clientes'}.` : 'Mensaje publicado.');
        setTitle('');
        setBody('');
        router.refresh();
      } else toast.error(ERRORS[res.error] ?? 'No se pudo enviar.');
    });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Título</span>
        <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="El lunes es feriado" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Mensaje</span>
        <textarea value={body} maxLength={1500} rows={4} onChange={(e) => setBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="El gimnasio abre de 9 a 13. Las clases de la tarde se suspenden." />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Cuánto tiempo se muestra</span>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-48">
          {MESSAGE_DAYS.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted-foreground">Después desaparece solo de la pantalla de tus clientes. Podés sacarlo antes cuando quieras.</span>
      </label>
      <Button disabled={pending} onClick={send}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Publicar mensaje
      </Button>
    </div>
  );
}
