'use client';

import { createContext, useContext, useMemo } from 'react';
import { LOCALE_COOKIE, type Locale } from './config';
import type { Dictionary } from './index';

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * `t` viene ya resuelto del server (`getT()` en `layout.tsx`) — este
 * componente NUNCA importa `getDictionary` ni los diccionarios: si lo hiciera,
 * los 6 idiomas completos viajarían al bundle del navegador aunque el usuario
 * sólo use uno.
 */
export function I18nProvider({
  locale,
  t,
  children,
}: {
  locale: Locale;
  t: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      t,
      setLocale: (next) => {
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        window.location.reload();
      },
    }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return ctx;
}

/** Azúcar: `const t = useT();` */
export function useT(): Dictionary {
  return useI18n().t;
}
