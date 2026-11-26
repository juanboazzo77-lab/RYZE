import { useCallback, useEffect, useState } from 'react';
import { loadAccount, type Account } from './account';
import { Main } from './screens/Main';
import { Login } from './screens/Login';
import { useText } from './strings';
import { Button, Card, Screen } from './ui';

type State = { step: 'opening' } | { step: 'error' } | { step: 'ready'; account: Account | null };

/** Al abrir se mira en el teléfono quién tiene la sesión: no hace falta internet. */
export function App() {
  const [state, setState] = useState<State>({ step: 'opening' });
  const s = useText();

  const open = useCallback(() => {
    setState({ step: 'opening' });
    loadAccount()
      .then((account) => setState({ step: 'ready', account }))
      .catch(() => setState({ step: 'error' }));
  }, []);
  useEffect(open, [open]);

  if (state.step === 'opening') return <Screen><p className="text-sm text-muted-foreground">{s.opening}</p></Screen>;
  if (state.step === 'error') {
    return (
      <Screen>
        <Card className="space-y-2 border-warning text-sm">
          <p>{s.openError}</p>
          <Button variant="outline" onClick={open}>{s.tryAgain}</Button>
        </Card>
      </Screen>
    );
  }
  const { account } = state;
  return account ? (
    <Main key={account.userId} account={account} onSignedOut={() => setState({ step: 'ready', account: null })} />
  ) : (
    <Login onSignedIn={(next) => setState({ step: 'ready', account: next })} />
  );
}
