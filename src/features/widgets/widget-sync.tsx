'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { getWidgetSnapshot } from './actions';

/** Plugin nativo propio (ios/App/App/WidgetBridgePlugin.swift): deja la foto de datos para los widgets. */
interface WidgetBridgePlugin {
  setSnapshot(options: { json: string }): Promise<void>;
  clear(): Promise<void>;
}
const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/** Sólo en la app de iPhone y sólo si esa versión de la app trae el plugin (las anteriores no lo tienen). */
function bridgeAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('WidgetBridge');
}

const DEBOUNCE_MS = 2000;
const REFRESH_MS = 90_000;

/**
 * Mantiene al día los widgets del teléfono: cada vez que se abre la app, se cambia de pantalla o
 * pasa un rato, pide la foto de datos y se la entrega al plugin nativo (que recarga los widgets).
 * No dibuja nada, y no hace nada fuera de la app de iPhone.
 */
export function WidgetSync() {
  const pathname = usePathname();

  useEffect(() => {
    if (!bridgeAvailable()) return;
    let last = '';
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function push() {
      if (running || document.visibilityState !== 'visible') return;
      running = true;
      try {
        const snap = await getWidgetSnapshot();
        const json = JSON.stringify(snap);
        // Sin cambios (salvo la hora de generación) no hace falta recargar los widgets.
        const key = JSON.stringify({ ...snap, updatedAt: '' });
        if (key === last) return;
        await WidgetBridge.setSnapshot({ json });
        last = key;
      } catch (e) {
        console.error('[widgets] no se pudo actualizar', e);
      } finally {
        running = false;
      }
    }

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void push(), DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') schedule();
    };

    schedule();
    const interval = setInterval(schedule, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // Cada cambio de pantalla vuelve a sincronizar (registrar algo suele terminar en otra pantalla).
  }, [pathname]);

  return null;
}

/** En las pantallas de acceso (sin sesión) borra lo que los widgets tenían guardado. */
export function WidgetClear() {
  useEffect(() => {
    if (!bridgeAvailable()) return;
    WidgetBridge.clear().catch(() => {});
  }, []);
  return null;
}
