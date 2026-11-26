import { useState, type FormEvent } from 'react';
import { signIn, type Account } from '../account';
import { useOnline } from '../platform/use-online';
import { useText } from '../strings';
import { Button, Card, Input, Screen } from '../ui';

export function Login({ onSignedIn, notice, email: fixedEmail, onCancel }: {
  onSignedIn: (account: Account) => void;
  notice?: string;
  /** Al renovar una sesión vencida, el email ya está definido. */
  email?: string;
  onCancel?: () => void;
}) {
  const online = useOnline();
  const s = useText();
  const errors = { credentials: s.badCredentials, connection: s.cannotConnect };
  const [email, setEmail] = useState(fixedEmail ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<'credentials' | 'connection' | null>(null);
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
          <h2 className="text-lg font-bold">{s.loginTitle}</h2>
          <p className="text-sm text-muted-foreground">
            {notice ?? s.loginIntro}
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {s.email}
            <Input type="email" autoComplete="email" autoCapitalize="none" required value={email} readOnly={Boolean(fixedEmail)} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {s.password}
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error ? <p role="alert" className="text-sm text-warning">{errors[error]}</p> : null}
          {!online ? <p className="text-sm text-warning">{s.loginNeedsSignal}</p> : null}
          <Button type="submit" disabled={busy || !online}>{busy ? s.entering : s.enter}</Button>
          {onCancel ? <Button variant="outline" onClick={onCancel}>{s.stayOffline}</Button> : null}
        </form>
      </Card>
      <p className="text-center text-xs text-muted-foreground">{s.noAccount}</p>
    </Screen>
  );
}
