import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/i18n';

/**
 * Bloqueo de una feature del plan pago. Sin cobro: informativo hasta que haya
 * facturación. Por defecto habla de PRO; pasá `title`/`badge` para otro plan
 * (ej. COACH). `ctaHref` agrega un botón (ej. a la comparativa de planes).
 */
export function UpsellCard({
  t,
  description,
  title,
  badge,
  ctaHref,
  ctaLabel,
}: {
  t: Dictionary;
  description: string;
  title?: string;
  badge?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className="border-primary/30 bg-accent">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </span>
        <div>
          <p className="font-semibold">{title ?? t.pro.title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          {badge ?? t.pro.badge}
        </span>
        {ctaHref ? (
          <Button asChild size="sm" className="mt-1">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
