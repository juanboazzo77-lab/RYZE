import { Dumbbell, MessageCircle, Scale, Trophy, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Dictionary } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import type { UnitSystem } from '@prisma/client';
import { displayWeightDelta } from '@/lib/units';
import { cn } from '@/lib/utils';
import type { TrialRecap } from './recap';

/**
 * «Lo que ya lograste»: lo que la persona hizo en la app, sobre los planes. Es el mejor argumento
 * para suscribirse: se ve lo que perdería (rutinas, registros, récords) si la prueba termina.
 */
export function TrialRecapCard({
  t,
  recap,
  ended,
  unitSystem,
}: {
  t: Dictionary;
  recap: TrialRecap;
  ended: boolean;
  unitSystem: UnitSystem;
}) {
  const r = t.plans.recap;
  const items: Array<{ icon: ReactNode; value: string; label: string }> = [];
  if (recap.workouts > 0) items.push({ icon: <Dumbbell className="size-4" />, value: String(recap.workouts), label: r.workouts });
  if (recap.meals > 0) items.push({ icon: <UtensilsCrossed className="size-4" />, value: String(recap.meals), label: r.meals });
  if (recap.coachMessages > 0) items.push({ icon: <MessageCircle className="size-4" />, value: String(recap.coachMessages), label: r.coachMessages });
  if (recap.records > 0) items.push({ icon: <Trophy className="size-4" />, value: String(recap.records), label: r.records });
  if (recap.weightChangeKg !== null && recap.weightChangeKg !== 0) {
    const d = displayWeightDelta(recap.weightChangeKg, unitSystem);
    items.push({
      icon: <Scale className="size-4" />,
      value: `${d.value > 0 ? '+' : ''}${d.value} ${unitSystem === 'IMPERIAL' ? 'lb' : 'kg'}`,
      label: r.weight,
    });
  }
  if (items.length === 0) return null;

  return (
    <Card className="border-primary/40 bg-accent/40">
      <CardContent className="space-y-3 pt-5">
        <div>
          <p className="font-semibold">{ended ? r.titleEnded : r.title}</p>
          <p className="text-xs text-muted-foreground">{ended ? r.hintEnded : r.hint}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {items.map((it, i) => (
            <div
              key={it.label}
              className={cn(
                'rounded-lg border bg-card p-3 text-center',
                // Si queda uno solo en la última fila del celular, ocupa el ancho entero.
                i === items.length - 1 && items.length % 2 === 1 && 'col-span-2 sm:col-span-1',
              )}
            >
              <div className="mx-auto mb-1 grid size-7 place-items-center rounded-full bg-primary/10 text-primary">
                {it.icon}
              </div>
              <p className="text-xl font-bold tabular-nums">{it.value}</p>
              <p className="text-[11px] text-muted-foreground">{it.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
