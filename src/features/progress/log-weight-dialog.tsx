'use client';

import { toast } from 'sonner';
import { useT } from '@/i18n/provider';
import type { UnitSystem } from '@prisma/client';
import { logWeight } from './actions';
import { WeightDialog, type WeightValues } from './weight-dialog';

export function LogWeightDialog(props: {
  todayISO: string;
  unitSystem: UnitSystem;
  defaultDate?: string;
  defaultKg?: number | null;
  defaultNote?: string | null;
  trigger?: React.ReactNode;
}) {
  const t = useT();

  async function submit(values: WeightValues) {
    const res = await logWeight(values);
    if (res.ok) {
      toast.success(t.progress.saved);
      // Avisa al recordatorio de la mañana (apps nativas) para que saque el aviso de hoy.
      window.dispatchEvent(new Event('forza:weight-logged'));
    } else toast.error(t.progress.genericError);
    return Boolean(res.ok);
  }

  return <WeightDialog {...props} onSubmit={submit} onInvalid={() => toast.error(t.progress.invalidWeight)} />;
}
