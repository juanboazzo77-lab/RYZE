import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import type { ClientExtras } from '@/server/trainer-client-extras';

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Bloque desplegable: la ficha tiene mucho, así que lo detallado se abre cuando hace falta. */
function Section({ title, count, children, open = false }: { title: string; count?: number; children: React.ReactNode; open?: boolean }) {
  return (
    <Card>
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            {count != null ? <Badge variant="secondary">{count}</Badge> : null}
            <span className="transition-transform group-open:rotate-90">›</span>
          </span>
        </summary>
        <CardContent className="space-y-3 pt-0 text-sm">{children}</CardContent>
      </details>
    </Card>
  );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-muted-foreground">{children}</p>;

/** Todo lo que el entrenador puede ver de su cliente, en detalle. */
export function ClientFullDetail({ x }: { x: ClientExtras }) {
  return (
    <div className="space-y-4">
      <Section title="Perfil completo" open>
        {x.facts.length === 0 ? (
          <Empty>El cliente todavía no cargó sus datos.</Empty>
        ) : (
          x.facts.map((s) => (
            <div key={s.title} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{s.title}</p>
              <dl className="divide-y rounded-lg border">
                {s.rows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-4 px-3 py-1.5">
                    <dt className="text-muted-foreground">{r.label}</dt>
                    <dd className="text-right">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </Section>

      <Section title="Cuestionario de coaching" count={x.coachingLines.length}>
        {x.coachingLines.length === 0 ? (
          <Empty>No completó el cuestionario de coaching.</Empty>
        ) : (
          <ul className="space-y-1">
            {x.coachingLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Deportes y competencias" count={x.sportLines.length}>
        {x.sportLines.length === 0 ? (
          <Empty>No cargó deportes ni competencias.</Empty>
        ) : (
          <ul className="space-y-1">
            {x.sportLines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Entrenamientos (últimos 20)" count={x.workouts.length}>
        {x.workouts.length === 0 ? (
          <Empty>Todavía no completó entrenamientos.</Empty>
        ) : (
          <ul className="space-y-3">
            {x.workouts.map((w, i) => (
              <li key={i} className="space-y-1 rounded-lg border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{w.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {w.date ? fmtDate(w.date) : ''}
                    {w.minutes ? ` · ${w.minutes} min` : ''}
                    {w.effort ? ` · esfuerzo ${w.effort}` : ''}
                  </span>
                </div>
                {w.exercises.length > 0 ? (
                  <ul className="space-y-0.5 text-xs">
                    {w.exercises.map((e, j) => (
                      <li key={j} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{e.name}</span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {e.sets} series{e.best ? ` · mejor ${e.best}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {w.notes ? <p className="text-xs text-muted-foreground">{w.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Récords personales" count={x.records.length}>
        {x.records.length === 0 ? (
          <Empty>Todavía no tiene récords.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {x.records.map((r, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate">{r.exercise}</span>
                  <span className="text-xs text-muted-foreground">{r.type}</span>
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  {r.value} {r.unit}
                  <span className="block text-xs text-muted-foreground">{fmtDate(r.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Comidas" count={x.nutritionDays.length}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hoy</p>
        {x.todayMeals.length === 0 ? (
          <Empty>Todavía no cargó comidas hoy.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border">
            {x.todayMeals.map((m, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-1.5">
                <span className="min-w-0">
                  <span className="block truncate">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.meal} · {m.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{m.kcal} kcal</span>
              </li>
            ))}
          </ul>
        )}
        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Últimos 14 días</p>
        {x.nutritionDays.length === 0 ? (
          <Empty>No cargó comidas en los últimos 14 días.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border text-xs tabular-nums">
            {x.nutritionDays.map((d) => (
              <li key={d.date} className="flex justify-between gap-3 px-3 py-1.5">
                <span>{fmtDate(d.date)}</span>
                <span className="text-right text-muted-foreground">
                  {d.kcal} kcal · P {d.proteinG} · C {d.carbsG} · G {d.fatG}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Peso (historial de 6 meses)" count={x.weights.length}>
        {x.weights.length === 0 ? (
          <Empty>Todavía no cargó su peso.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border text-xs tabular-nums">
            {[...x.weights].reverse().map((w) => (
              <li key={w.date} className="flex justify-between gap-3 px-3 py-1.5">
                <span>{fmtDate(w.date)}</span>
                <span className="text-right">
                  {w.weightKg} kg{w.note ? <span className="ml-2 text-muted-foreground">{w.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Actividad diaria (pasos, 14 días)" count={x.steps.length}>
        {x.steps.length === 0 ? (
          <Empty>No hay pasos registrados.</Empty>
        ) : (
          <ul className="divide-y rounded-lg border text-xs tabular-nums">
            {x.steps.map((s) => (
              <li key={s.date} className="flex justify-between gap-3 px-3 py-1.5">
                <span>{fmtDate(s.date)}</span>
                <span>
                  {s.steps.toLocaleString('es-AR')} pasos{s.activeMinutes ? ` · ${s.activeMinutes} min activos` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
