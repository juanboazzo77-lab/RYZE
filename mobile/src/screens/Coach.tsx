import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CoachChat } from '@/features/coach/chat';
import type { Dictionary } from '@/i18n';
import { rpc } from '../online/rpc';
import { useOnline } from '../platform/use-online';
import { useText } from '../strings';
import { Card } from '../ui';

type ScreenData = { configured: false } | ({ configured: true } & Pick<ComponentProps<typeof CoachChat>, 'usage' | 'autoApply'> & {
      threads: ComponentProps<typeof CoachChat>['initialThreads'];
      history: ComponentProps<typeof CoachChat>['initialHistory'];
    });

/** El coach necesita internet. La pantalla del chat es la misma de la web. */
export function Coach({ t, beforeLoad }: { t: Dictionary; /** Sube lo pendiente, para que el coach lo tenga en cuenta. */ beforeLoad: () => Promise<void> }) {
  const s = useText();
  const online = useOnline();
  const [data, setData] = useState<ScreenData | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      await beforeLoad().catch(() => undefined);
      setData(await rpc<ScreenData>('coach.screen'));
    } catch {
      setFailed(true);
    }
  }, [beforeLoad]);

  // Se carga al entrar, y solo si hace falta cuando vuelve la señal.
  const missing = data === null;
  useEffect(() => {
    if (online && missing) void load();
  }, [online, missing, load]);

  useEffect(() => {
    const onLink = () => toast.message(s.stillOnWeb);
    window.addEventListener('forza:link', onLink);
    return () => window.removeEventListener('forza:link', onLink);
  }, [s]);

  const offlineNotice = (
    <Card className="flex items-start gap-3 text-sm">
      <WifiOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <p>{s.coachNeedsInternet}</p>
    </Card>
  );

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.coach.title}</h1>
        <p className="text-sm text-muted-foreground">{t.coach.subtitle}</p>
      </div>
      {!online ? offlineNotice : null}
      {data?.configured ? (
        // Sin señal la conversación queda a la vista; mandar un mensaje avisa que no se pudo.
        <CoachChat initialThreads={data.threads} initialHistory={data.history} usage={data.usage} autoApply={data.autoApply} />
      ) : data ? (
        <Card className="text-sm text-muted-foreground">{t.coach.notConfigured}</Card>
      ) : !online ? null : failed ? (
        <Card className="space-y-3 text-sm">
          <p>{s.onlineFailed}</p>
          <Button variant="outline" onClick={() => void load()}>{s.tryAgain}</Button>
        </Card>
      ) : (
        <Card className="text-sm text-muted-foreground">{s.onlineLoading}</Card>
      )}
    </div>
  );
}
