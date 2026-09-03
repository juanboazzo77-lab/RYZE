import type { Locale } from './config';
import { es } from './dictionaries/es';
import { en } from './dictionaries/en';

/** Convierte los tipos literales del diccionario base en `string`. */
type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

export type Dictionary = DeepStringify<typeof es>;

/** Devuelve el diccionario del locale. Ambos van en el bundle (son chicos). */
export function getDictionary(locale: Locale): Dictionary {
  return locale === 'en' ? en : (es as Dictionary);
}

/** Reemplaza `{clave}` en `template` por `vars.clave`. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

export type { Locale } from './config';
