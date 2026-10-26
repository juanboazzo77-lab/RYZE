import type { ReactNode } from 'react';

export type IllustrationKind = 'workout' | 'food' | 'scale' | 'chart' | 'trophy' | 'calendar';

/**
 * Ilustraciones de línea para los estados vacíos. Usan sólo los colores del tema (fondo suave +
 * trazo primario/atenuado), así se ven bien en claro y en oscuro sin variantes aparte.
 */
const ART: Record<IllustrationKind, ReactNode> = {
  workout: (
    <>
      <rect x="22" y="44" width="52" height="8" rx="4" className="fill-muted-foreground/40" />
      <rect x="14" y="32" width="10" height="32" rx="4" className="fill-primary" />
      <rect x="72" y="32" width="10" height="32" rx="4" className="fill-primary" />
      <rect x="24" y="37" width="7" height="22" rx="3" className="fill-primary/60" />
      <rect x="65" y="37" width="7" height="22" rx="3" className="fill-primary/60" />
    </>
  ),
  food: (
    <>
      <circle cx="48" cy="50" r="24" className="fill-card stroke-muted-foreground/40" strokeWidth="3" />
      <circle cx="48" cy="50" r="15" className="fill-primary/15 stroke-primary" strokeWidth="2.5" />
      <path d="M18 26v16m5-16v16m5-16v16M23 42v28" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M78 26c-5 4-6 14-1 22v22" className="stroke-primary" strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
  scale: (
    <>
      <rect x="20" y="22" width="56" height="52" rx="12" className="fill-card stroke-muted-foreground/40" strokeWidth="3" />
      <path d="M34 44a14 14 0 0 1 28 0" className="stroke-primary" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M48 44l6-8" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
      <circle cx="48" cy="44" r="2.5" className="fill-primary" />
      <rect x="34" y="56" width="28" height="6" rx="3" className="fill-muted-foreground/25" />
    </>
  ),
  chart: (
    <>
      <rect x="18" y="52" width="12" height="20" rx="3" className="fill-primary/40" />
      <rect x="36" y="40" width="12" height="32" rx="3" className="fill-primary/60" />
      <rect x="54" y="30" width="12" height="42" rx="3" className="fill-primary/80" />
      <path d="M18 40l18-12 18 6 22-16" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M70 18h8v8" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  trophy: (
    <>
      <path d="M32 22h32v18a16 16 0 0 1-32 0z" className="fill-warning/25 stroke-warning" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 28H20c0 12 5 18 13 18M64 28h12c0 12-5 18-13 18" className="stroke-warning" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M48 56v10M38 74h20" className="stroke-warning" strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="18" y="24" width="60" height="50" rx="10" className="fill-card stroke-muted-foreground/40" strokeWidth="3" />
      <path d="M18 40h60" className="stroke-muted-foreground/40" strokeWidth="3" />
      <path d="M34 18v12M62 18v12" className="stroke-primary" strokeWidth="4" strokeLinecap="round" />
      <path d="M36 57l8 8 16-16" className="stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
};

export function Illustration({ kind, size = 88 }: { kind: IllustrationKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden className="shrink-0">
      <circle cx="48" cy="48" r="44" className="fill-secondary" />
      {ART[kind]}
    </svg>
  );
}
