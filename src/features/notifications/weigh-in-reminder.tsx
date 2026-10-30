'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useT } from '@/i18n/provider';
import { getWeighInStatus } from '@/features/progress/actions';
import { REMINDERS_CHANGED_EVENT } from './reminder-events';

/** Evento que se dispara al registrar el peso, para sacar el aviso de hoy. */
export const WEIGHT_LOGGED_EVENT = 'forza:weight-logged';

/** Dos avisos por día dentro de la ventana de las 6 a las 11: temprano y un recordatorio más tarde. */
const SLOTS: Array<{ hour: number; minute: number }> = [
  { hour: 8, minute: 0 },
  { hour: 10, minute: 30 },
];
const DAYS_AHEAD = 7;
const BASE_ID = 2100; // ids propios: 2100 + día * 10 + franja
const idFor = (day: number, slot: number) => BASE_ID + day * 10 + slot;
const ALL_IDS = Array.from({ length: DAYS_AHEAD }, (_, d) => SLOTS.map((_s, i) => idFor(d, i))).flat();

/**
 * Aviso para registrar el peso por la mañana (6 a 11), pensado para verse en la pantalla de
 * bloqueo sin abrir la app. Usa notificaciones LOCALES del teléfono (no necesitan servidor ni
 * claves de Apple). Cuando se registra el peso, el aviso de hoy se cancela y, si ya apareció,
 * se saca de la pantalla. Sin UI; sólo actúa dentro de la app nativa.
 */
export function WeighInReminder() {
  const t = useT();
  const title = t.progress.reminderTitle;
  const body = t.progress.reminderBody;
  const bodyLate = t.progress.reminderBodyLate;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let running = false;

    async function sync() {
      if (running) return;
      running = true;
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const status = await getWeighInStatus();

        let perm = await LocalNotifications.checkPermissions();
        if (status.enabled && (perm.display === 'prompt' || perm.display === 'prompt-with-rationale')) {
          perm = await LocalNotifications.requestPermissions();
        }
        if (perm.display !== 'granted') return;

        // Se empieza de cero: cancela lo pendiente y saca de la pantalla lo que ya se mostró.
        await LocalNotifications.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
        const delivered = await LocalNotifications.getDeliveredNotifications();
        const ours = delivered.notifications.filter((n) => ALL_IDS.includes(n.id));
        if (ours.length > 0) await LocalNotifications.removeDeliveredNotifications({ notifications: ours });
        if (!status.enabled) return;

        const now = new Date();
        const notifications: Array<{
          id: number;
          title: string;
          body: string;
          schedule: { at: Date; allowWhileIdle: boolean };
        }> = [];
        for (let d = 0; d < DAYS_AHEAD; d++) {
          // Hoy sólo si todavía no se pesó (y la hora no pasó).
          if (d === 0 && status.weighedToday) continue;
          SLOTS.forEach((slot, i) => {
            const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, slot.hour, slot.minute, 0, 0);
            if (at.getTime() <= now.getTime() + 30_000) return;
            notifications.push({
              id: idFor(d, i),
              title,
              body: i === 0 ? body : bodyLate,
              schedule: { at, allowWhileIdle: true },
            });
          });
        }
        if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
      } catch (e) {
        console.error('[weigh-in] no se pudieron programar los avisos', e);
      } finally {
        running = false;
      }
    }

    void sync();
    const onLogged = () => void sync();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    window.addEventListener(WEIGHT_LOGGED_EVENT, onLogged);
    window.addEventListener(REMINDERS_CHANGED_EVENT, onLogged);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(WEIGHT_LOGGED_EVENT, onLogged);
      window.removeEventListener(REMINDERS_CHANGED_EVENT, onLogged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [title, body, bodyLate]);

  return null;
}
