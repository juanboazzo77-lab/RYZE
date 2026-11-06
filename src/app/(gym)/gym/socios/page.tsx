import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getOwnerView, INACTIVE_DAYS } from '@/server/gyms';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Socios' };
export const dynamic = 'force-dynamic';

type Level = 'ok' | 'late' | 'risk' | 'new';

function levelOf(daysSinceLast: number | null, joinedDaysAgo: number): Level {
  if (daysSinceLast === null) return joinedDaysAgo >= INACTIVE_DAYS ? 'risk' : 'new';
  if (daysSinceLast <= 3) return 'ok';
  if (daysSinceLast < INACTIVE_DAYS) return 'late';
  return 'risk';
}

const LABEL: Record<Level, { text: string; variant: 'success' | 'secondary' | 'warning' }> = {
  ok: { text: 'Al día', variant: 'success' },
  late: { text: 'Atrasado', variant: 'secondary' },
  risk: { text: 'En riesgo', variant: 'warning' },
  new: { text: 'Recién entró', variant: 'secondary' },
};

/** Los socios del gimnasio: nombre y cuándo entrenaron por última vez, de los que aceptaron compartirlo. */
export default async function GymMembersPage() {
  const ctx = await requireUser();
  if (!ctx.ownedGym) redirect('/dashboard');
  const view = await getOwnerView(ctx.userId, ctx.ownedGym.id);
  if (!view) redirect('/dashboard');

  const rows = view.sharedMembers.map((m) => ({ ...m, level: levelOf(m.daysSinceLastWorkout, m.joinedDaysAgo) }));
  const count = (l: Level) => rows.filter((r) => r.level === l).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Socios</h1>
        <p className="text-xs text-muted-foreground">
          {view.activeMembers} de {view.memberLimit} lugares usados. Primero los que hace más que no entrenan.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border p-2.5">
          <p className="text-xl font-bold tabular-nums">{count('ok')}</p>
          <p className="text-[11px] text-muted-foreground">Al día</p>
        </div>
        <div className="rounded-xl border p-2.5">
          <p className="text-xl font-bold tabular-nums">{count('late')}</p>
          <p className="text-[11px] text-muted-foreground">Atrasados</p>
        </div>
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-2.5">
          <p className="text-xl font-bold tabular-nums">{count('risk')}</p>
          <p className="text-[11px] text-muted-foreground">En riesgo</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Todavía no hay socios que compartan su nombre. Cuando un socio ingresa tu código, elige si te deja ver su nombre y su actividad.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rows.map((m, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.daysSinceLastWorkout === null
                    ? 'Todavía no entrenó'
                    : m.daysSinceLastWorkout === 0
                      ? 'Entrenó hoy'
                      : `Entrenó hace ${m.daysSinceLastWorkout} ${m.daysSinceLastWorkout === 1 ? 'día' : 'días'}`}
                  {' · '}socio hace {m.joinedDaysAgo} {m.joinedDaysAgo === 1 ? 'día' : 'días'}
                </p>
              </div>
              <Badge variant={LABEL[m.level].variant}>{LABEL[m.level].text}</Badge>
            </li>
          ))}
        </ul>
      )}

      {view.hiddenMembers > 0 ? (
        <p className="text-xs text-muted-foreground">
          {view.hiddenMembers} {view.hiddenMembers === 1 ? 'socio eligió' : 'socios eligieron'} no compartir su nombre: los ves solo en los totales. Nunca ves el peso, las fotos ni las comidas de nadie.
        </p>
      ) : null}
    </div>
  );
}
