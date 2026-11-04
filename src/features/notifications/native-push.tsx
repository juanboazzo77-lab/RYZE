'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { saveDeviceToken } from './device-token-actions';

/**
 * Avisos remotos (APNs) en la app de iPhone: pide permiso, registra el teléfono en el servidor y abre
 * la pantalla correcta al tocar un aviso (por ejemplo, el chat con el entrenador). Sin UI; sólo actúa
 * dentro de la app nativa. Los recordatorios del coach siguen siendo locales (device-reminders).
 */
export function NativePush() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return;
    if (!Capacitor.isPluginAvailable('PushNotifications')) return;

    let cancelled = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    void (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted' || cancelled) return;

        handles.push(
          await PushNotifications.addListener('registration', (token) => {
            void saveDeviceToken({ token: token.value });
          }),
        );
        handles.push(
          await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
            const url = (event.notification.data as { url?: unknown } | undefined)?.url;
            // Sólo rutas propias de la app.
            if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) router.push(url);
          }),
        );
        await PushNotifications.register();
      } catch (e) {
        console.error('[native-push]', e instanceof Error ? e.message : e);
      }
    })();

    return () => {
      cancelled = true;
      for (const h of handles) void h.remove();
    };
  }, [router]);

  return null;
}
