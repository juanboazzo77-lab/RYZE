'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { useT } from '@/i18n/provider';
import { getReminderPlan } from './reminder-actions';
import { REMINDERS_CHANGED_EVENT } from './reminder-events';

/** Días hacia adelante que se dejan programados; se renuevan cada vez que se abre la app. */
const DAYS_AHEAD = 7;
const BASE_ID = 3000; // ids propios: 3000 + día * 10 + franja (el aviso de peso usa 2100…)
const SLOT = { workout: 0, evening: 1, checkin: 2 } as const;
const idFor = (day: number, slot: number) => BASE_ID + day * 10 + slot;
const ALL_IDS = Array.from({ length: DAYS_AHEAD }, (_, d) => Object.values(SLOT).map((s) => idFor(d, s))).flat();

type EveningKind = 'STREAK' | 'PROTEIN_GOAL' | 'LOG_MEALS';
const EVENING_TIME: Record<EveningKind, [number, number]> = {
  STREAK: [19, 30],
  PROTEIN_GOAL: [19, 0],
  LOG_MEALS: [21, 0],
};

const localISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Avisos del coach en el teléfono: entrenamiento del día, racha, comidas, proteína y revisión
 * semanal. Usa notificaciones LOCALES (no necesitan servidor ni claves de Apple, y funcionan con
 * la app cerrada): se programan los próximos días según el plan y los interruptores de Ajustes, y
 * se rearman al abrir la app, al cambiar de pantalla o al tocar un interruptor — así lo que ya
 * hiciste hoy no te vuelve a avisar. Máximo dos por día (uno a la mañana, uno a la tarde-noche),
 * como el coach de la web. Sin UI; sólo actúa dentro de la app nativa.
 */
export function DeviceReminders() {
  const t = useT();
  const tl = t.notifications.local;
  const router = useRouter();
  const pathname = usePathname();

  // Siempre la última versión de la función, sin volver a suscribir los listeners.
  const syncRef = useRef<() => void>(() => {});
  const running = useRef(false);
  const queued = useRef(false);

  syncRef.current = async function sync() {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('LocalNotifications')) return;
    if (running.current) {
      queued.current = true;
      return;
    }
    running.current = true;
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const plan = await getReminderPlan();
      const wants = (k: keyof typeof plan.enabled) => plan.enabled[k] !== false;
      const anyEnabled = (['WORKOUT_TODAY', 'STREAK', 'PROTEIN_GOAL', 'LOG_MEALS', 'WEEKLY_CHECKIN'] as const).some(wants);

      let perm = await LocalNotifications.checkPermissions();
      if (anyEnabled && (perm.display === 'prompt' || perm.display === 'prompt-with-rationale')) {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return;

      // Se empieza de cero: cancela lo pendiente y saca de la pantalla lo que ya se mostró.
      await LocalNotifications.cancel({ notifications: ALL_IDS.map((id) => ({ id })) });
      const delivered = await LocalNotifications.getDeliveredNotifications();
      const ours = delivered.notifications.filter((n) => ALL_IDS.includes(n.id));
      if (ours.length > 0) await LocalNotifications.removeDeliveredNotifications({ notifications: ours });
      if (!anyEnabled) return;

      const now = new Date();
      const notifications: Array<{
        id: number;
        title: string;
        body: string;
        schedule: { at: Date; allowWhileIdle: boolean };
        extra: { url: string };
      }> = [];
      const add = (id: number, at: Date, title: string, body: string, url: string) => {
        if (at.getTime() <= now.getTime() + 30_000) return;
        notifications.push({ id, title, body, schedule: { at, allowWhileIdle: true }, extra: { url } });
      };

      for (let d = 0; d < DAYS_AHEAD; d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
        const at = (h: number, m: number) =>
          new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0, 0);
        const weekday = day.getDay() === 0 ? 7 : day.getDay();
        const training = plan.trainingDays[weekday];
        const isToday = d === 0;

        // Mañana: hoy toca entrenar.
        if (training && wants('WORKOUT_TODAY') && !(isToday && plan.trainedToday)) {
          add(
            idFor(d, SLOT.workout),
            at(9, 0),
            tl.workoutTitle,
            tl.workoutBody.replace('{name}', training.name).replace('{n}', String(training.exercises)),
            '/training',
          );
        }

        // Tarde-noche: uno solo por día. En día de entrenamiento, la racha; el resto, proteína o comidas.
        let evening: EveningKind | null = null;
        if (training && wants('STREAK') && plan.hasStreak && !(isToday && plan.trainedToday)) {
          evening = 'STREAK';
        } else {
          const options: EveningKind[] = [];
          if (wants('PROTEIN_GOAL') && plan.proteinLeftG !== null && !(isToday && plan.proteinOk)) {
            options.push('PROTEIN_GOAL');
          }
          if (wants('LOG_MEALS') && !(isToday && plan.mealsToday >= 2)) options.push('LOG_MEALS');
          if (options.length > 0) evening = options[day.getDate() % options.length] ?? null;
        }
        if (evening) {
          const [h, m] = EVENING_TIME[evening];
          const when = at(h, m);
          const id = idFor(d, SLOT.evening);
          if (evening === 'STREAK') add(id, when, tl.streakTitle, tl.streakBody, '/training');
          else if (evening === 'LOG_MEALS') add(id, when, tl.mealsTitle, tl.mealsBody, '/nutrition');
          else {
            const left = isToday && plan.proteinLeftG ? plan.proteinLeftG : 0;
            add(id, when, tl.proteinTitle, left > 0 ? tl.proteinBodyN.replace('{n}', String(left)) : tl.proteinBody, '/nutrition');
          }
        }

        // Revisión semanal, el día elegido.
        if (wants('WEEKLY_CHECKIN') && plan.checkinISO === localISO(day)) {
          add(idFor(d, SLOT.checkin), at(10, 0), tl.checkinTitle, tl.checkinBody, '/checkin');
        }
      }

      if (notifications.length > 0) await LocalNotifications.schedule({ notifications });
    } catch (e) {
      console.error('[reminders] no se pudieron programar los avisos', e);
    } finally {
      running.current = false;
      if (queued.current) {
        queued.current = false;
        void syncRef.current();
      }
    }
  };

  // Al abrir, al volver a la app y cuando cambia un interruptor.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const run = () => void syncRef.current();
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    run();
    window.addEventListener(REMINDERS_CHANGED_EVENT, run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(REMINDERS_CHANGED_EVENT, run);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Al cambiar de pantalla (p. ej. terminar un entrenamiento o cargar comidas) se rearma lo de hoy.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const timer = setTimeout(() => void syncRef.current(), 1500);
    return () => clearTimeout(timer);
  }, [pathname]);

  // Tocar un aviso lleva a la pantalla que corresponde.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let remove: (() => void) | undefined;
    let cancelled = false;
    void import('@capacitor/local-notifications').then(async ({ LocalNotifications }) => {
      const handle = await LocalNotifications.addListener('localNotificationActionPerformed', (ev) => {
        const url = (ev.notification.extra as { url?: string } | undefined)?.url;
        if (url && url.startsWith('/')) router.push(url);
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    });
    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
