'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestLoginLink } from './actions';

/** Pide el mail y manda un enlace de ingreso; no hay contraseña. */
export function LoginForm() {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await requestLoginLink({ email });
      if (res.sent) setSent(true);
      else setError(res.error ?? 'No se pudo enviar.');
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-semibold">Revisá tu mail</p>
        <p className="mt-1 text-muted-foreground">
          Si ese mail es de administrador, te mandamos un enlace para entrar. Abrilo en este mismo navegador. Puede tardar un minuto; mirá también en spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Tu mail de administrador</span>
        <Input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || email.length < 5}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Enviarme el enlace
      </Button>
    </form>
  );
}
