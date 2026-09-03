import { cn } from '@/lib/utils';

/** Anillo (donut SVG) de calorías consumidas vs objetivo. */
export function CalorieRing({
  consumed,
  target,
  centerLabel,
  footer,
  size = 168,
}: {
  consumed: number;
  target: number;
  centerLabel: string;
  footer: string;
  size?: number;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? consumed / target : 0;
  const over = pct > 1;
  const dash = Math.min(pct, 1) * c;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={over ? 'var(--warning)' : 'var(--chart-kcal)'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn('text-3xl font-bold tabular-nums', over && 'text-warning')}
          >
            {centerLabel}
          </span>
          <span className="mt-0.5 text-xs text-muted-foreground">{footer}</span>
        </div>
      </div>
    </div>
  );
}
