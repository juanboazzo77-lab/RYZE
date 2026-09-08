'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/provider';
import { savePushSubscription, removePushSubscription, sendTestPush } from './push-actions';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export function PushToggle() {
  const t = useT();
  const tp = t.notifications.push;

  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      Boolean(VAPID_PUBLIC_KEY);
    setSupported(ok);
    if (!ok) return;
    setDenied(Notification.permission === 'denied');
    getRegistration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setDenied(perm === 'denied');
        toast.error(tp.denied);
        return;
      }
      const reg = await getRegistration();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToBytes(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? '',
        auth: json.keys?.auth ?? '',
        userAgent: navigator.userAgent.slice(0, 400),
      });
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {});
        toast.error(t.common.error);
        return;
      }
      setSubscribed(true);
      toast.success(t.common.saved);
      void sendTestPush();
    } catch {
      toast.error(t.common.error);
    } finally {
      setBusy(false);
    }
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
