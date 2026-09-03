import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from './config';
import { getDictionary, type Dictionary } from './index';

/** Locale efectivo del request (cookie NEXT_LOCALE, default `es`). */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
});

/** Diccionario del request. */
export const getT = cache(async (): Promise<{ locale: Locale; t: Dictionary }> => {
  const locale = await getLocale();
  return { locale, t: getDictionary(locale) };
});
