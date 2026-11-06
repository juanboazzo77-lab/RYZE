import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { listClasses, upcomingForOwner } from '@/server/gym-classes';
import { ClassForm } from '@/features/owner/class-form';
import { ClassRowActions } from '@/features/owner/class-row-actions';
import { timeRange, todayAR, weekdayLabel, weekdayOf, WEEKDAYS } from '@/features/gym/classes';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Clases' };
export const dynamic = 'force-dynamic';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Clases con reserva: la grilla semanal y quién reservó en los próximos días. */
export default async function GymClassesPage() {
  const owner = await requireOwnerPage();
  const now = new Date();
  const [classes, upcoming] = await Promise.all([listClasses(owner.userId, owner.gym.id), upcomingForOwner(owner.userId, owner.gym.id, now)]);
  const rows = classes ?? [];
  const today = todayAR(now);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clases</h1>
        <p className="text-sm text-muted-foreground">Armá tu grilla semanal. Tus socios con Forza AI reservan desde la app, y cada clase respeta el cupo que pongas.</p>
      </div>

      <ClassForm />

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Tu grilla semanal</h2>
        {rows.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no cargaste clases.</p>
        ) : (
          WEEKDAYS.filter((w) => rows.some((r) => r.weekday === w.n)).map((w) => (
            <div key={w.n} className="space-y-1">
              <p className="text-sm font-medium">{w.label}</p>
              <ul className="divide-y rounded-xl border">
                {rows
                  .filter((r) => r.weekday === w.n)
                  .map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.name} {r.active ? null : <Badge variant="secondary">Pausada</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeRange(r.startTime, r.durationMin)} · cupo {r.capacity}
                          {r.instructor ? ` · ${r.instructor}` : ''}
                        </p>
                      </div>
                      <ClassRowActions id={r.id} name={r.name} active={r.active} />
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
      </section>

      {upcoming && upcoming.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Reservas de los próximos 7 días</h2>
          <ul className="divide-y rounded-xl border">
            {upcoming.map((u) => (
              <li key={`${u.classId}${u.date}`} className="space-y-0.5 px-3 py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-medium">
                    {u.name} · {u.date === today ? 'hoy' : `${weekdayLabel(weekdayOf(u.date))} ${fmtDay(u.date)}`} {u.startTime}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {u.attendees.length}/{u.capacity}
                  </span>
                </div>
                {u.attendees.length > 0 ? <p className="text-xs text-muted-foreground">{u.attendees.join(', ')}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
