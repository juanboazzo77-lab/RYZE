'use client';

import { useEffect } from 'react';

/** Registra el service worker (Web Push). Sin UI. */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
