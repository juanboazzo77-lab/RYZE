import Link from 'next/link';
import { cn } from '@/lib/utils';

export const usd = (n: number) => `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Hace cuánto pasó algo, en palabras simples. */
export function ago(iso: string, now: number = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
}

/** Número grande con una etiqueta; si tiene `href` lleva a donde se resuelve. */
export function Kpi({
  label,
  value,
  sub,
  tone = 'normal',
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'normal' | 'alert' | 'good';
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        'h-full rounded-xl border p-3',
        tone === 'alert' && 'border-warning/50 bg-warning/10',
        tone === 'good' && 'border-success/40 bg-success/10',
        href && 'transition-colors hover:bg-secondary/50',
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function Section({ title, href, linkText, children }: { title: string; href?: string; linkText?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {href ? (
          <Link href={href} className="text-xs text-muted-foreground underline hover:text-foreground">
            {linkText ?? 'Ver todo'}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
