import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppearanceView } from '@/features/settings/appearance-view';
import type { Dictionary } from '@/i18n';
import type { AppData } from '@/lib/sync/data';
import { useText } from '../strings';
import { useTheme } from '../theme';
import { Card } from '../ui';

/**
 * Ajustes: tema, idioma y unidades funcionan sin señal. Lo demás se cambia con internet (el perfil y los objetivos
 * definen las calorías y lo que usa el coach, así que se calculan en el servidor).
 */
export function Settings({
  t,
  data,
  email,
  confirmingLogout,
  onPrefs,
  onLogout,
  onKeep,
  onLogoutAnyway,
}: {
  t: Dictionary;
  data: AppData | null;
  email: string;
  confirmingLogout: boolean;
  onPrefs: (prefs: { locale?: string; unitSystem?: 'METRIC' | 'IMPERIAL' }) => Promise<void>;
  onLogout: () => void;
  onKeep: () => void;
  onLogoutAnyway: () => void;
}) {
  const s = useText();
  const { theme, setTheme } = useTheme();
  const [failed, setFailed] = useState(false);

  const save = (prefs: Parameters<typeof onPrefs>[0]) => {
    setFailed(false);
    onPrefs(prefs).catch(() => setFailed(true));
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>
      {failed ? <Card className="border-warning text-sm text-warning">{s.saveFailed}</Card> : null}
      {data ? (
        <AppearanceView
          theme={theme}
          onTheme={setTheme}
          onLocale={(locale) => save({ locale: locale.toUpperCase() })}
          unitSystem={data.profile.unitSystem}
          onUnits={(unitSystem) => {
            if (unitSystem !== data.profile.unitSystem) save({ unitSystem });
          }}
        />
      ) : null}
      <Card className="text-sm text-muted-foreground">{s.settingsOnWeb}</Card>

      {confirmingLogout ? (
        <Card className="space-y-3 border-warning text-sm">
          <p>{s.logoutWarning}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onKeep}>{s.dontLogout}</Button>
            <Button variant="outline" className="h-auto whitespace-normal text-warning" onClick={onLogoutAnyway}>{s.logoutAnyway}</Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" className="w-full" onClick={onLogout}>
          <LogOut className="size-4" />
          {t.auth.signOut}
        </Button>
      )}

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {email} · {s.testVersion}
        <br />
        <a href="https://www.forzaai.app/privacy" target="_blank" rel="noreferrer" className="underline">{t.auth.privacyLink}</a>
        {' · '}
        <a href="https://www.forzaai.app/terms" target="_blank" rel="noreferrer" className="underline">{t.auth.termsLink}</a>
      </p>
    </>
  );
}
