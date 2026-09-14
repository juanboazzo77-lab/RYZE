import type { Locale } from './config';
import { es } from './dictionaries/es';
import { en } from './dictionaries/en';
import { pt } from './dictionaries/pt';
import { fr } from './dictionaries/fr';
import { de } from './dictionaries/de';
import { it } from './dictionaries/it';

/** Convierte los tipos literales del diccionario base en `string`. */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<typeof es>;

const DICTIONARIES: Record<Locale, Dictionary> = {
  es: es as Dictionary,
  en,
  pt,
  fr,
  de,
  it,
};

/**
 * Devuelve el diccionario del locale. SOLO para uso server-side (`getT()`,
 * `layout.tsx`): importa los 6 idiomas completos. Un componente cliente NUNCA
 * debe importar esta función — el bundle del navegador terminaría con los 6
 * diccionarios en vez de sólo el que hace falta. El cliente recibe el
 * diccionario ya resuelto como prop vía `<I18nProvider t={...}>`.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export { interpolate } from './interpolate';
export type { Locale } from './config';
