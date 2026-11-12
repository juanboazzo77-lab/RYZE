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
  BODY: 'Escribí el mensaje (al menos 5 letras).',
};

const dayLabel = (d: number) => (d === 1 ? '1 día' : `${d} días`);

/** Escribirle un aviso a todos los clientes conectados (feriados, cambios de horario, novedades). Para uno solo: WhatsApp desde su ficha. */
export function MessageForm({ connected }: { connected: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [days, setDays] = useState<number>(DEFAULT_MESSAGE_DAYS);
  // La confirmación se muestra en la propia página (los cuadros del navegador pueden estar bloqueados y no avisar nada).
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function review() {
    if (title.trim().length < 3) return setError(ERRORS.TITLE!);
    if (body.trim().length < 5) return setError(ERRORS.BODY!);
    setError(null);
    setConfirming(true);
  }

  function send() {
    setError(null);
    start(async () => {
      try {
        const res = await sendClientMessage({ title, body, days });
        if ('ok' in res) {
          toast.success(res.notified > 0 ? `Mensaje publicado. Se avisa a ${res.notified} ${res.notified === 1 ? 'cliente' : 'clientes'}.` : 'Mensaje publicado.');
          setTitle('');
          setBody('');
          setConfirming(false);
          router.refresh();
        } else {
          setConfirming(false);
          setError(ERRORS[res.error] ?? 'No se pudo enviar.');
        }
      } catch {
        setConfirming(false);
        setError('No se pudo publicar. Revisá tu conexión y probá de nuevo.');
      }
    });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Título</span>
        <Input value={title} maxLength={80} onChange={(e) => { setTitle(e.target.value); setConfirming(false); }} placeholder="El lunes es feriado" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Mensaje</span>
        <textarea value={body} maxLength={1500} rows={4} onChange={(e) => { setBody(e.target.value); setConfirming(false); }} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="El gimnasio abre de 9 a 13. Las clases de la tarde se suspenden." />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Cuánto tiempo se muestra</span>
        <select value={days} onChange={(e) => { setDays(Number(e.target.value)); setConfirming(false); }} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-48">
          {MESSAGE_DAYS.map((d) => (
            <option key={d} value={d}>
              {dayLabel(d)}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted-foreground">Después desaparece solo de la pantalla de tus clientes. Podés sacarlo antes cuando quieras.</span>
      </label>

      {error ? (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {confirming ? (
        <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-sm">
            Lo van a ver <strong>{connected}</strong> {connected === 1 ? 'cliente conectado' : 'clientes conectados'} en la pantalla principal de la app durante {dayLabel(days)}, y les llega una notificación.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={send}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Sí, publicar
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              Volver
            </Button>
          </div>
        </div>
      ) : (
        <Button disabled={pending} onClick={review}>
          <Send className="size-4" />
          Publicar mensaje
        </Button>
      )}
    </div>
  );
}
