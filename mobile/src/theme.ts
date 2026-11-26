import { useEffect, useState } from 'react';

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

/** Antes del primer dibujo, para que no haya un destello del tema equivocado. */
export const applyStoredTheme = () => apply(read());

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* sólo es una preferencia */
    }
    const media = systemDark();
    const onChange = () => apply(theme);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);
  return { theme, next: () => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length]!) };
}
