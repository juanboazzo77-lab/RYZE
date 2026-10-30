import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Plugin nativo propio (ios/App/App/WidgetBridgePlugin.swift): deja la foto de datos para los widgets
 * y muestra el descanso entre series como Live Activity en la pantalla de bloqueo.
 */
interface WidgetBridgePlugin {
  setSnapshot(options: { json: string }): Promise<void>;
  clear(): Promise<void>;
  startRest(options: {
    /** Fin del descanso, en milisegundos desde 1970. */
    endsAt: number;
    totalSeconds: number;
    title: string;
    subtitle?: string;
  }): Promise<{ started: boolean }>;
  endRest(): Promise<void>;
}

export const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

/** Sólo en la app de iPhone y sólo si esa versión de la app trae el plugin (las anteriores no lo tienen). */
export function bridgeAvailable(): boolean {
  return Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('WidgetBridge');
}

/** Muestra (o actualiza) la cuenta regresiva del descanso fuera de la app. Nunca falla. */
export function startRestActivity(options: {
  endsAt: number;
  totalSeconds: number;
  title: string;
  subtitle?: string;
}): void {
  if (!bridgeAvailable()) return;
  // Las versiones de la app sin esta función rechazan la llamada: se ignora.
  WidgetBridge.startRest(options).catch(() => {});
}

/** Cierra la cuenta regresiva del descanso. Nunca falla. */
export function endRestActivity(): void {
  if (!bridgeAvailable()) return;
  WidgetBridge.endRest().catch(() => {});
}
