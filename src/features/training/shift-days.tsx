'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { shiftPlanWeekdays } from './actions';

function useShift() {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  function shift(by: 1 | -1) {
    start(async () => {
      const res = await shiftPlanWeekdays({ by }).catch(() => null);
      if (res?.ok) {
        toast.success(by === 1 ? t.training.shift.shifted : t.training.shift.shiftedBack);
        router.refresh();
      } else {
        toast.error(t.training.shift.error);
      }
    });
  }
  return { pending, shift };
}

/** Pie de la rutina activa: correr toda la semana un día hacia atrás o hacia adelante. */
export function ShiftDaysControls() {
  const t = useT();
  const { pending, shift } = useShift();
  return (
    <div className="space-y-2 border-t pt-3">
      <p className="text-xs text-muted-foreground">{t.training.shift.hint}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={() => shift(-1)}>
          {pending ? <Loader2 className="animate-spin" /> : <ChevronLeft />}
          {t.training.shift.back}
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={() => shift(1)}>
          {t.training.shift.forward}
          {pending ? <Loader2 className="animate-spin" /> : <ChevronRight />}
        </Button>
      </div>
    </div>
  );
}

/** Atajo del inicio: «hoy no pude entrenar», corre todo un día. */
export function SkipTodayButton() {
  const t = useT();
  const { pending, shift } = useShift();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => shift(1)}
      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {t.training.shift.skipToday}
    </button>
  );
}
