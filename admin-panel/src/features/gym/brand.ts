/**
 * Marca propia del gimnasio: color y logo. Hay una copia de este archivo en admin-panel/src/features/gym/brand.ts
 * (el panel es un sitio aparte): si cambia uno, cambiar el otro.
 */

export const DEFAULT_BRAND_COLOR = '#1d9a5f';

/** #rrggbb en minúsculas, o null si no es un color válido. Acepta #rgb y sin el #. */
export function normalizeHexColor(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().toLowerCase().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return null;
  const h = m[1]!;
  return `#${h.length === 3 ? [...h].map((c) => c + c).join('') : h}`;
}

/** Blanco o casi negro, el que se lea mejor sobre ese color. */
export function readableOn(hex: string): '#ffffff' | '#111111' {
  const c = normalizeHexColor(hex) ?? DEFAULT_BRAND_COLOR;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? '#111111' : '#ffffff';
}

/** El logo solo se muestra si es una dirección https (nunca javascript: ni data:). */
export function safeLogoUrl(url: string | null | undefined): string | null {
  return url && /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : null;
}

export const MAX_LOGO_BYTES = 400 * 1024;

/** Tipo de imagen por sus primeros bytes (no por lo que diga el navegador). Solo png, jpg o webp: nunca svg. */
export function sniffImage(bytes: Uint8Array): { type: 'image/png' | 'image/jpeg' | 'image/webp'; ext: 'png' | 'jpg' | 'webp' } | null {
  const is = (...sig: number[]) => sig.every((b, i) => bytes[i] === b);
  if (bytes.length > 12 && is(0x89, 0x50, 0x4e, 0x47)) return { type: 'image/png', ext: 'png' };
  if (bytes.length > 12 && is(0xff, 0xd8, 0xff)) return { type: 'image/jpeg', ext: 'jpg' };
  if (bytes.length > 12 && is(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return { type: 'image/webp', ext: 'webp' };
  return null;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/**
 * Variables de color de la app para un socio de este gimnasio: el color de su marca en botones y detalles. Si el
 * color es casi blanco o casi negro (se perdería sobre el fondo, claro u oscuro) devuelve null y la app queda
 * con el verde de Forza AI.
 */
export function brandTheme(raw: string | null | undefined): Record<string, string> | null {
  const hex = normalizeHexColor(raw);
  if (!hex) return null;
  const lum = luminance(hex);
  if (lum < 0.05 || lum > 0.85) return null;
  return {
    '--primary': hex,
    '--primary-foreground': readableOn(hex),
    '--ring': hex,
    '--accent': `color-mix(in srgb, ${hex} 14%, var(--background))`,
    '--accent-foreground': 'var(--foreground)',
  };
}
