'use client';

import { useEffect } from 'react';
import { fireConfetti } from '@/lib/confetti';

/** Tira confeti una vez al aparecer (la `storageKey` evita repetirlo al recargar la pantalla). */
export function CelebrateOnMount({ storageKey }: { storageKey: string }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, '1');
    } catch {
      // sin sessionStorage: se celebra igual
    }
    const h = setTimeout(() => fireConfetti(), 250);
    return () => clearTimeout(h);
  }, [storageKey]);
  return null;
}
