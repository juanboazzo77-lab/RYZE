import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getOwnedGym, getOwnerView, INACTIVE_DAYS } from '@/server/gyms';
import { OwnerProfileEditor } from '@/features/gym/owner-profile-editor';
import { formatGymCode, usedPercent } from '@/features/gym/logic';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Mi gimnasio' };
export const dynamic = 'force-dynamic';

function Stat({ label, value, sub, alert }: { label: string; value: string | number; sub?: string; alert?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alert ? 'border-warning/50 bg-warning/10' : ''}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Pantalla del dueño de un gimnasio: sólo la ve la cuenta que el administrador vinculó como dueña. */
export default async function MyGymPage() {
  const ctx = await requireUser();
  const owned = await getOwnedGym(ctx.userId);
  if (!owned) notFound();
  const view = await getOwnerView(ctx.userId, owned.id);
  if (!view) notFound();
  const pct = usedPercent(view.activeMembers, view.memberLimit);

  return (
    <div className="space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Ajustes
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{view.name}</h1>
        {view.status === 'SUSPENDED' ? <Badge variant="warning">Suspendido</Badge> : <Badge variant="success">Activo</Badge>}
      </div>

      {view.status === 'SUSPENDED' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Tu gimnasio está suspendido: tus socios no tienen acceso gratis por ahora. Escribinos a gimnasios@forzaai.app.
        </p>
      ) : null}

      <div className="space-y-2 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Código para tus socios</p>
        <p className="select-all font-mono text-3xl font-bold tracking-widest">{view.inviteCode ? formatGymCode(view.inviteCode) : '—'}</p>
        <p className="text-xs text-muted-foreground">
          Compartilo en recepción o por tu grupo de socios. Lo ingresan en Forza AI, en Ajustes, en Gimnasio.
        </p>
        <div className="pt-1">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              <span className="text-lg font-semibold tabular-nums">{view.activeMembers}</span> / {view.memberLimit} socios
            </span>
            <span className="text-xs text-muted-foreground">{pct}% del cupo</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          {view.memberLimit > 0 && view.activeMembers >= view.memberLimit ? (
            <p className="mt-1 text-xs text-warning">Cupo lleno: para sumar más socios, escribinos a gimnasios@forzaai.app.</p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Entrenaron esta semana" value={view.trainedThisWeek} sub={`de ${view.activeMembers} socios`} />
        <Stat
          label={`Sin entrenar hace ${INACTIVE_DAYS}+ días`}
          value={view.inactiveCount}
          sub="En riesgo de irse"
          alert={view.inactiveCount > 0}
        />
      </div>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Socios que comparten su actividad</h2>
        {view.sharedMembers.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">
            Ningún socio activó todavía compartir su nombre. Cada uno decide si quiere hacerlo, en Ajustes, en Gimnasio.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {view.sharedMembers.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">{m.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {m.daysSinceLastWorkout === null
                    ? 'todavía no entrenó'
                    : m.daysSinceLastWorkout === 0
                      ? 'entrenó hoy'
                      : `hace ${m.daysSinceLastWorkout} ${m.daysSinceLastWorkout === 1 ? 'día' : 'días'}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {view.hiddenMembers > 0 ? (
          <p className="text-xs text-muted-foreground">
            {view.hiddenMembers} {view.hiddenMembers === 1 ? 'socio no comparte' : 'socios no comparten'} su nombre. Solo ves el total. Tampoco ves el peso, las fotos ni las comidas de nadie.
          </p>
        ) : null}
      </section>

      <OwnerProfileEditor specialty={view.specialty} profile={view.profile} />
    </div>
  );
}
