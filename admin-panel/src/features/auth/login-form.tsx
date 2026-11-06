'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestLoginLink, signInWithPassword } from './actions';

/** Entrar con mail y contraseña, o pidiendo un enlace por mail. */
export function LoginForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      if (mode === 'password') {
        const res = await signInWithPassword({ email, password });
        if (res.sent) router.replace(res.to ?? '/gym');
        else setError(res.error ?? 'No se pudo entrar.');
      } else {
        const res = await requestLoginLink({ email });
        if (res.sent) setSent(true);
        else setError(res.error ?? 'No se pudo enviar.');
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border p-4 text-sm">
        <p className="font-semibold">Revisá tu mail</p>
        <p className="mt-1 text-muted-foreground">
          Si ese mail tiene acceso, te mandamos un enlace para entrar. Abrilo en este mismo navegador. Puede tardar un minuto; mirá también en spam.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Tu mail</span>
        <Input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {mode === 'password' ? (
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">Contraseña</span>
          <Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || email.length < 5 || (mode === 'password' && password.length < 1)}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {mode === 'password' ? 'Entrar' : 'Enviarme el enlace'}
      </Button>
      <button
        type="button"
        className="w-full text-center text-xs text-muted-foreground underline"
        onClick={() => {
          setMode(mode === 'password' ? 'link' : 'password');
          setError(null);
        }}
      >
        {mode === 'password' ? 'No tengo o no recuerdo mi contraseña: entrar con un enlace por mail' : 'Entrar con mi contraseña'}
      </button>
    </form>
  );
}
