'use client';

import { savePushSubscription, sendTestPush } from './push-actions';

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

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(VAPID_PUBLIC_KEY)
  );
}

export async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  return existing ?? navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

export async function hasPushSubscription(): Promise<boolean> {
  try {
    const reg = await getRegistration();
    return Boolean(await reg.pushManager.getSubscription());
  } catch {
    return false;
  }
}

/** Suscribe este dispositivo (el permiso ya tiene que estar concedido) y lo guarda. */
export async function subscribeThisDevice(): Promise<boolean> {
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
    return false;
  }
  return true;
}

export type EnablePushResult = 'ok' | 'denied' | 'error';

/** Pide permiso (hace falta un toque del usuario) y deja el dispositivo suscripto. */
export async function enablePush(): Promise<EnablePushResult> {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const ok = await subscribeThisDevice();
    if (!ok) return 'error';
    void sendTestPush();
    return 'ok';
  } catch {
    return 'error';
  }
}
