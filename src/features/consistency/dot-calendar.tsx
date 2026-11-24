import type { YearGridView } from './queries';

const STEP = 12;
const RADIUS = 4.3;
const TOP = 16;

/**
 * Un año de entrenamientos en puntos: una columna por semana, una fila por día. Con color los días que
 * entrenaste, en gris los de descanso y muy tenues los que todavía no llegaron.
 */
export function DotCalendar({ grid, monthNames }: { grid: YearGridView; monthNames: string[] }) {
  const width = grid.cols * STEP;
  const height = TOP + 7 * STEP;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={String(grid.year)}>
      {grid.months.map((m) => (
        <text
          key={m.month}
          x={m.col * STEP}
          y={10}
          fontSize={9}
          fontWeight={500}
          style={{ fill: 'var(--muted-foreground)' }}
        >
          {monthNames[m.month - 1]}
        </text>
      ))}
      {grid.cells.map((c, i) => (
        <circle
          key={i}
          cx={c.col * STEP + STEP / 2}
          cy={TOP + c.row * STEP + STEP / 2}
          r={RADIUS}
          style={{
            fill:
              c.state === 'trained'
                ? 'var(--primary)'
                : c.state === 'rest'
                  ? 'color-mix(in srgb, var(--foreground) 14%, transparent)'
                  : 'color-mix(in srgb, var(--foreground) 5%, transparent)',
          }}
        />
      ))}
    </svg>
  );
}
