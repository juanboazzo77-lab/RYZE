import { useState, type FormEvent } from 'react';
import { signIn, type Account } from '../account';
import { useOnline } from '../platform/use-online';
import { Button, Card, Input, Screen } from '../ui';

const ERRORS = {
  credentials: 'El email o la contraseña no son correctos.',
  connection: 'No se pudo conectar. Revisá la señal y probá de nuevo.',
};

export function Login({ onSignedIn, notice, email: fixedEmail, onCancel }: {
  onSignedIn: (account: Account) => void;
  notice?: string;
  /** Al renovar una sesión vencida, el email ya está definido. */
  email?: string;
  onCancel?: () => void;
}) {
  const online = useOnline();
  const [email, setEmail] = useState(fixedEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<keyof typeof ERRORS | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.ok) onSignedIn(res.account);
    else setError(res.reason);
  }

  return (
    <Screen>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Iniciar sesión</h2>
          <p className="text-sm text-muted-foreground">
            {notice ?? 'Usá la misma cuenta que en Forza AI. Sólo la primera vez hace falta internet.'}
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <Input type="email" autoComplete="email" autoCapitalize="none" required value={email} readOnly={Boolean(fixedEmail)} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Contraseña
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <p role="alert" className="text-sm text-warning">{ERRORS[error]}</p> : null}
          {!online ? <p className="text-sm text-warning">Para iniciar sesión necesitás conexión.</p> : null}
          <Button type="submit" disabled={busy || !online}>{busy ? 'Entrando…' : 'Entrar'}</Button>
          {onCancel ? <Button variant="outline" onClick={onCancel}>Seguir sin conectar</Button> : null}
        </form>
      </Card>
      <p className="text-center text-xs text-muted-foreground">¿No tenés cuenta o te olvidaste la contraseña? Hacelo en forzaai.app.</p>
    </Screen>
  );
}
