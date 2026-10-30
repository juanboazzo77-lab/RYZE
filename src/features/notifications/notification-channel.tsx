'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { PushToggle } from './push-toggle';
import { notifyRemindersChanged } from './reminder-events';

type Permission = 'granted' | 'denied' | 'prompt';

const TEST_ID = 3999;

/** Dentro de la app del teléfono los avisos son locales: se muestra el permiso y una prueba. */
function NativeNotificationsCard() {
  const t = useT();
  const tn = t.notifications.native;
  const [perm, setPerm] = useState<Permission | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const p = await LocalNotifications.checkPermissions();
      setPerm(p.display === 'granted' ? 'granted' : p.display === 'denied' ? 'denied' : 'prompt');
    } catch {
      setPerm('denied');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  async function enable() {
    setBusy(true);
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const p = await LocalNotifications.requestPermissions();
      setPerm(p.display === 'granted' ? 'granted' : 'denied');
      if (p.display === 'granted') notifyRemindersChanged();
    } catch {
      toast.error(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            id: TEST_ID,
            title: tn.testTitle,
            body: tn.testBody,
            schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
          },
        ],
      });
      toast.success(tn.testSent);
    } catch {
      toast.error(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (perm === null) return null;

  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{tn.title}</p>
          <p className="text-xs text-muted-foreground">
            {perm === 'granted' ? tn.permOn : perm === 'denied' ? tn.permOff : tn.permAsk}
          </p>
        </div>
        {perm === 'granted' ? (
          <Button size="sm" variant="outline" onClick={sendTest} disabled={busy}>
            {tn.test}
          </Button>
        ) : perm === 'prompt' ? (
          <Button size="sm" onClick={enable} disabled={busy}>
            {tn.enable}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

/** Web: notificaciones push del navegador. App del teléfono: avisos locales. */
export function NotificationChannel() {
  const [native, setNative] = useState<boolean | null>(null);
  useEffect(() => setNative(Capacitor.isNativePlatform()), []);
  if (native === null) return null;
  return native ? <NativeNotificationsCard /> : <PushToggle />;
}
