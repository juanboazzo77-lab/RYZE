import { Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { Dictionary } from '@/i18n';

/** Bloqueo de una feature PRO. Sin cobro: informativo hasta que haya facturación. */
export function UpsellCard({ t, description }: { t: Dictionary; description: string }) {
  return (
    <Card className="border-primary/30 bg-accent">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-6" />
        </span>
        <div>
          <p className="font-semibold">{t.pro.title}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          {t.pro.badge}
        </span>
      </CardContent>
    </Card>
  );
}
