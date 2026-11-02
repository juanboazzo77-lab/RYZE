'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { applyCheckinAdjustments } from './actions';

/** Botón al pie de la revisión: aplica de una vez los ajustes que propuso el Coach (nutrición y rutina). */
export function ApplyAdjustments({ applied }: { applied: boolean }) {
  const t = useT();
  const ta = t.checkin.applyAdjustments;
  const router = useRouter();
  const [pending, start] = useTransition();

  function apply() {
    start(async () => {
      const res = await applyCheckinAdjustments().catch(() => null);
      if (res?.ok) {
        toast.success(ta.done);
        router.refresh();
      } else {
        toast.error(ta.error);
      }
    });
  }

  if (applied) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-sm font-medium text-success">
          <Check className="size-4" />
          {ta.done}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-3 py-4">
        <p className="text-sm text-muted-foreground">{ta.hint}</p>
        <Button size="lg" className="w-full" onClick={apply} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {ta.button}
        </Button>
      </CardContent>
    </Card>
  );
}
