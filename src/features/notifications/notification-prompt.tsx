'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { enablePush, hasPushSubscription, isPushSupported, subscribeThisDevice } from './push-client';

const SNOOZE_KEY = 'forza:push-prompt-snoozed';

/**
 * Al entrar a la app, si las notificaciones todavía no están activadas, pide
 * activarlas. Se vuelve a mostrar en cada visita (no en cada pantalla) hasta que
 * las active o las bloquee. En navegadores sin Web Push (p. ej. dentro de la app
 * nativa de iPhone) no hace nada.
 */
export function NotificationPrompt() {
  const t = useT();
  const tp = t.notifications.prompt;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    let cancelled = false;

    (async () => {
      if (Notification.permission === 'denied') return;
      const subscribed = await hasPushSubscription();
      if (cancelled || subscribed) return;

      if (Notification.permission === 'granted') {
        // Permiso ya concedido pero el dispositivo no está registrado: se registra sin preguntar.
        await subscribeThisDevice().catch(() => {});
        return;
      }

      try {
        if (sessionStorage.getItem(SNOOZE_KEY)) return;
      } catch {
        // sin sessionStorage: se muestra igual
      }
      // Un momento después de entrar, para no tapar la carga inicial.
      setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, 1500);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function later() {
    try {
      sessionStorage.setItem(SNOOZE_KEY, '1');
    } catch {
      // ignorar
    }
    setOpen(false);
  }

  async function enable() {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    setOpen(false);
    if (res === 'ok') toast.success(t.common.saved);
    else if (res === 'denied') toast.error(t.notifications.push.denied);
    else toast.error(t.common.error);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : later())}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 grid size-12 place-items-center rounded-full bg-primary/15 text-primary">
            <Bell className="size-6" />
          </div>
          <DialogTitle className="text-lg">{tp.title}</DialogTitle>
          <DialogDescription>{tp.desc}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={enable} disabled={busy}>
            {tp.enable}
          </Button>
          <Button variant="ghost" onClick={later} disabled={busy}>
            {tp.later}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
