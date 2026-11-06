'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setPasswordAction } from './actions';

/** El dueño elige su contraseña y entra directo a su panel. */
export function PasswordForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== again) {
      setError('Las dos contraseñas tienen que ser iguales.');
      return;
    }
    start(async () => {
      const res = await setPasswordAction({ password });
      if (res.ok) router.replace(res.to ?? '/gym');
      else setError(res.error ?? 'No se pudo guardar.');
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Contraseña nueva</span>
        <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Repetila</span>
        <Input type="password" required minLength={8} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending || password.length < 8}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Guardar y entrar
      </Button>
    </form>
  );
}
