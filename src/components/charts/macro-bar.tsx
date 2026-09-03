import { cn } from '@/lib/utils';

/** Barra de progreso de un macronutriente: consumido / objetivo. */
export function MacroBar({
  label,
  consumed,
  target,
  colorVar,
}: {
  label: string;
  consumed: number;
  target: number;
  colorVar: string;
}) {
  const pct = target > 0 ? Math.min(consumed / target, 1) * 100 : 0;
  const over = target > 0 && consumed > target;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className={cn('tabular-nums text-muted-foreground', over && 'text-warning')}>
          {consumed} / {target} g
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: over ? 'var(--warning)' : colorVar }}
        />
      </div>
    </div>
  );
}
