'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const PREV_PATH_KEY = 'forza:prev-path';

/**
 * Recuerda la pantalla anterior de la app (en la sesión del navegador) para que
 * los formularios con "Guardar" puedan devolver al usuario a donde estaba, sin
 * depender de `history.back()` (que puede salirse de la app).
 */
export function NavTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (last.current && last.current !== pathname) {
        sessionStorage.setItem(PREV_PATH_KEY, last.current);
      }
    } catch {
      // sessionStorage bloqueado (modo privado): no pasa nada, se usa el fallback
    }
    last.current = pathname;
  }, [pathname]);

  return null;
}
