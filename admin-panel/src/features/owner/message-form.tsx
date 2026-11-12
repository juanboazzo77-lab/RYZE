'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendClientMessage } from './message-actions';

const ERRORS: Record<string, string> = {
  INVALID: 'Revisá el mensaje.',
  NOT_OWNER: 'No se pudo enviar.',
  TITLE: 'Poné un título (al menos 3 letras).',
  BODY: 'Escribí el mensaje.',
};

/** Escribirle un aviso a los clientes del gimnasio (feriados, cambios de horario, novedades). */
export function MessageForm({ clientsWithEmail }: { clientsWithEmail: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [email, setEmail] = useState(false);

  function send() {
    if (!window.confirm(email ? `¿Mandar este mensaje a tus clientes en la app y por mail a ${clientsWithEmail}?` : '¿Publicar este mensaje en la app de tus clientes?')) return;
    start(async () => {
      const res = await sendClientMessage({ title, body, email });
      if ('ok' in res) {
        toast.success(res.emails > 0 ? `Mensaje publicado. ${res.emails} mails en camino.` : 'Mensaje publicado.');
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
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={email} onChange={(e) => setEmail(e.target.checked)} disabled={clientsWithEmail === 0} />
        <span>
          Mandar también por mail ({clientsWithEmail} {clientsWithEmail === 1 ? 'cliente tiene' : 'clientes tienen'} mail en tu lista)
          <span className="block text-xs text-muted-foreground">Igual lo ven en la app los que ya están conectados. El mail llega a todos los de tu lista.</span>
        </span>
      </label>
      <Button disabled={pending} onClick={send}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Publicar mensaje
      </Button>
    </div>
  );
}
