'use client';

import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { endRestActivity, startRestActivity } from '@/features/widgets/native';

function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Id propio de la notificación de fin de descanso (no choca con las del aviso de pesaje). */
const REST_NOTIFICATION_ID = 2900;
/** Tras el fin del descanso el cartel se queda un momento y se va solo. */
const DONE_LINGER_MS = 2500;
/** Si la app vuelve de segundo plano mucho después del fin, no suena: sólo se cierra. */
const LATE_MS = 8000;

let audioCtx: AudioContext | null = null;

/**
 * Hay que llamarla al tocar «serie hecha»: iOS sólo deja sonar el audio si el contexto se crea o
 * se reanuda dentro de un gesto del usuario, y el descanso termina bastante después.
 */
export function primeRestAudio(): void {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
  } catch {
    // sin audio: queda la vibración y el aviso visual
  }
}

function beep(): void {
  try {
    const ctx = audioCtx;
    if (!ctx || ctx.state !== 'running') return;
    const start = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1175 : 880;
      const t0 = start + i * 0.22;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    }
  } catch {
    // ignorar
  }
}

/** Las operaciones sobre la notificación van en fila para que no se pisen al sumar/restar tiempo. */
let notificationQueue: Promise<void> = Promise.resolve();
const enqueue = (job: () => Promise<void>) => {
  notificationQueue = notificationQueue.then(job, job);
};

function scheduleRestNotification(at: Date, title: string, body: string): void {
  if (!Capacitor.isNativePlatform()) return;
  enqueue(async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
        perm = await LocalNotifications.requestPermissions();
      }
      if (perm.display !== 'granted') return;
      await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
      await LocalNotifications.schedule({
        notifications: [
          { id: REST_NOTIFICATION_ID, title, body, schedule: { at, allowWhileIdle: true } },
        ],
      });
    } catch {
      // la app vieja no trae el plugin: el descanso sigue andando sin aviso en segundo plano
    }
  });
}

function clearRestNotification(): void {
  if (!Capacitor.isNativePlatform()) return;
  enqueue(async () => {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
      await LocalNotifications.removeDeliveredNotifications({
        notifications: [{ id: REST_NOTIFICATION_ID, title: '', body: '' }],
      });
    } catch {
      // ignorar
    }
  });
}

export function RestTimer({
  endsAt,
  onSkip,
  onExtend,
  label,
}: {
  endsAt: number;
  onSkip: () => void;
  /** Segundos a sumar (o restar, si es negativo) al descanso. */
  onExtend: (seconds: number) => void;
  /** Nombre del entrenamiento, para la cuenta regresiva de la pantalla de bloqueo. */
  label?: string;
}) {
  const t = useT();
  const s = t.training.session;
  const [now, setNow] = useState(() => Date.now());
  const totalRef = useRef(Math.max(1, (endsAt - Date.now()) / 1000));
  const announced = useRef(false);
  const onSkipRef = useRef(onSkip);
  useEffect(() => {
    onSkipRef.current = onSkip;
  }, [onSkip]);

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(h);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // El descanso más largo que tuvo (con los +15s) es la base de la barra.
  useEffect(() => {
    totalRef.current = Math.max(totalRef.current, (endsAt - Date.now()) / 1000);
  }, [endsAt]);

  // Aviso del teléfono por si la app queda en segundo plano; se corre si cambia el fin.
  useEffect(() => {
    scheduleRestNotification(new Date(endsAt), s.restNotifTitle, s.restNotifBody);
    return () => clearRestNotification();
  }, [endsAt, s.restNotifTitle, s.restNotifBody]);

  // Cuenta regresiva en la pantalla de bloqueo (Live Activity): se actualiza si cambia el fin y se
  // cierra al salir del descanso.
  useEffect(() => {
    startRestActivity({
      endsAt,
      totalSeconds: totalRef.current,
      title: s.restTitle,
      subtitle: label,
    });
  }, [endsAt, s.restTitle, label]);
  useEffect(() => () => endRestActivity(), []);

  const remaining = (endsAt - now) / 1000;
  const finished = remaining <= 0;

  useEffect(() => {
    if (!finished) {
      announced.current = false;
      return;
    }
    // Volvió de segundo plano mucho después del fin: ya lo avisó el teléfono, sólo se cierra.
    if (Date.now() - endsAt > LATE_MS) {
      onSkipRef.current();
      return;
    }
    if (!announced.current) {
      announced.current = true;
      beep();
      try {
        navigator.vibrate?.([220, 90, 220]);
      } catch {
        // no todos los dispositivos vibran
      }
    }
    const h = setTimeout(() => onSkipRef.current(), DONE_LINGER_MS);
    return () => clearTimeout(h);
  }, [finished, endsAt]);

  const fraction = finished ? 0 : Math.min(1, remaining / totalRef.current);

  return (
    <div className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-2xl px-4">
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card shadow-lg transition-colors',
          finished && 'border-success/60 bg-success/10',
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          {finished ? (
            <Check className="size-5 text-success" />
          ) : (
            <Timer className="size-5 text-primary" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              {finished ? s.restDone : s.restTitle}
            </p>
            <p className="text-lg font-bold tabular-nums">{fmt(remaining)}</p>
          </div>
          {finished ? null : (
            <>
              <Button variant="outline" size="sm" onClick={() => onExtend(-15)}>
                {s.minus15}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExtend(15)}>
                {s.plus15}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" aria-label={s.skip} onClick={onSkip}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-200"
            style={{ width: `${fraction * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
