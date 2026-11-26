import { useSyncExternalStore } from 'react';

/** Claro, oscuro o como el teléfono, igual que en la web. Es una preferencia: si no se puede guardar, no pasa nada. */
export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

const KEY = 'forza.theme';
const systemDark = () => window.matchMedia('(prefers-color-scheme: dark)');

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return THEMES.includes(v as Theme) ? (v as Theme) : 'system';
  } catch {
    return 'system';
  }
}

function apply(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemDark().matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

// Uno solo para toda la app: el botón de arriba y los ajustes muestran siempre lo mismo.
let current: Theme = 'system';
const listeners = new Set<() => void>();

function setTheme(theme: Theme) {
  current = theme;
  apply(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* sólo es una preferencia */
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Antes del primer dibujo, para que no haya un destello del tema equivocado. */
export function applyStoredTheme() {
  current = read();
  apply(current);
  systemDark().addEventListener('change', () => apply(current));
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);
  return { theme, setTheme, next: () => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!) };
}
