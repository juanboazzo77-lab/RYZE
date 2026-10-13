'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/provider';
import { removePushSubscription } from './push-actions';
import { enablePush, getRegistration, hasPushSubscription, isPushSupported } from './push-client';

export function PushToggle() {
  const t = useT();
  const tp = t.notifications.push;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = isPushSupported();
    setSupported(ok);
    if (!ok) return;
    setDenied(Notification.permission === 'denied');
    hasPushSubscription().then(setSubscribed);
  }, []);

  async function enable() {
    setBusy(true);
    const res = await enablePush();
    if (res === 'ok') {
      setSubscribed(true);
      toast.success(t.common.saved);
    } else if (res === 'denied') {
      setDenied(Notification.permission === 'denied');
      toast.error(tp.denied);
    } else {
      toast.error(t.common.error);
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await getRegistration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription({ endpoint: sub.endpoint });
        await sub.unsubscribe().catch(() => {});
      }
      setSubscribed(false);
      toast.success(t.common.saved);
    } catch {
      toast.error(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (supported === null) return null;

  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{tp.title}</p>
          <p className="text-xs text-muted-foreground">
            {!supported ? tp.unsupported : denied ? tp.blockedHint : tp.desc}
          </p>
        </div>
        <Switch
          checked={subscribed}
          disabled={!supported || busy || (denied && !subscribed)}
          onCheckedChange={(v) => (v ? enable() : disable())}
          aria-label={tp.title}
        />
      </div>
    </Card>
  );
}
