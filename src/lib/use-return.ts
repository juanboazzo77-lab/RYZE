'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PREV_PATH_KEY } from '@/components/nav-tracker';

/**
 * Devuelve una función que lleva al usuario a la pantalla de la que venía
 * (la anterior dentro de la app) o, si no se sabe, a `fallback`.
 */
export function useReturn(fallback: string) {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    let prev: string | null = null;
    try {
      prev = sessionStorage.getItem(PREV_PATH_KEY);
    } catch {
      prev = null;
    }
    const target = prev && prev !== pathname && prev.startsWith('/') ? prev : fallback;
    router.push(target);
  }, [router, pathname, fallback]);
}
