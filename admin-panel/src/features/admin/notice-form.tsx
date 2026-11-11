'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendGymNotice } from './notice-actions';

const ERRORS: Record<string, string> = {
  INVALID: 'Revisá el aviso.',
  TITLE: 'Poné un título (al menos 3 letras).',
  BODY: 'Escribí el mensaje.',
  LINK: 'El enlace tiene que empezar con http:// o https://.',
  NO_GYMS: 'No hay gimnasios para avisar.',
};

/** Escribir un aviso y mandarlo a todos los gimnasios o a algunos. */
export function NoticeForm({ gyms }: { gyms: Array<{ id: string; name: string; city: string | null }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [toAll, setToAll] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [email, setEmail] = useState(true);

  const count = toAll ? gyms.length : picked.length;

  function send() {
    if (count === 0) {
      toast.error('Elegí al menos un gimnasio.');
      return;
    }
    if (!window.confirm(`¿Mandar este aviso a ${count} ${count === 1 ? 'gimnasio' : 'gimnasios'}${email ? ' (también por mail)' : ''}?`)) return;
    start(async () => {
      const res = await sendGymNotice({ title, body, link, gymIds: toAll ? [] : picked, email });
      if ('ok' in res) {
        toast.success(`Aviso enviado a ${res.gyms} ${res.gyms === 1 ? 'gimnasio' : 'gimnasios'}${res.emails > 0 ? ` (${res.emails} mails en camino)` : ''}.`);
        setTitle('');
        setBody('');
        setLink('');
        router.refresh();
      } else toast.error(ERRORS[res.error] ?? 'No se pudo enviar.');
    });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Título</span>
        <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Novedad: ya podés cargar planes de pago" />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Mensaje</span>
        <textarea value={body} maxLength={2000} rows={5} onChange={(e) => setBody(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Escribí lo que quieras contarles. Podés separar párrafos con una línea en blanco." />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Enlace (opcional)</span>
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿A quién?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="audience" checked={toAll} onChange={() => setToAll(true)} />
          A todos los gimnasios ({gyms.length})
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="audience" checked={!toAll} onChange={() => setToAll(false)} />
          Elegir gimnasios
        </label>
        {!toAll ? (
          <div className="flex flex-wrap gap-2 pl-6">
            {gyms.map((g) => (
              <label key={g.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${picked.includes(g.id) ? 'border-primary bg-primary/10 font-medium' : ''}`}>
                <input type="checkbox" className="sr-only" checked={picked.includes(g.id)} onChange={() => setPicked((p) => (p.includes(g.id) ? p.filter((x) => x !== g.id) : [...p, g.id]))} />
                {g.name}
                {g.city ? <span className="text-xs text-muted-foreground">· {g.city}</span> : null}
              </label>
            ))}
          </div>
        ) : null}
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={email} onChange={(e) => setEmail(e.target.checked)} />
        <span>
          Mandar también por mail a los dueños
          <span className="block text-xs text-muted-foreground">Igual lo ven dentro de su panel, en Avisos. El mail sirve para los que no entran todos los días.</span>
        </span>
      </label>

      <Button disabled={pending} onClick={send}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar aviso
      </Button>
    </div>
  );
}
