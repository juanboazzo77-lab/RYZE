import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getOwnerView, INACTIVE_DAYS } from '@/server/gyms';
import { formatGymCode, usedPercent } from '@/features/gym/logic';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Panel del gimnasio' };
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

export default async function GymHomePage() {
  const ctx = await requireUser();
  if (!ctx.ownedGym) redirect('/dashboard');
  const view = await getOwnerView(ctx.userId, ctx.ownedGym.id);
  if (!view) redirect('/dashboard');
  const pct = usedPercent(view.activeMembers, view.memberLimit);
  const full = view.memberLimit > 0 && view.activeMembers >= view.memberLimit;
  const atRisk = view.sharedMembers.filter((m) => (m.daysSinceLastWorkout ?? m.joinedDaysAgo) >= INACTIVE_DAYS).slice(0, 5);

  return (
    <div className="space-y-4">
      {view.status === 'PENDING' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Tu gimnasio está en revisión. Apenas lo aprobemos vas a ver acá tu código para los socios y tu cupo. Mientras tanto ya podés cargar tus máquinas y tu especialidad en Equipamiento.
        </p>
      ) : null}

      {view.status === 'SUSPENDED' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Tu gimnasio está suspendido: tus socios no tienen acceso gratis por ahora. Escribinos a gimnasios@forzaai.app.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Socios" value={view.activeMembers} sub={`de ${view.memberLimit} del cupo`} />
        <Stat label="Entrenaron esta semana" value={view.trainedThisWeek} sub={view.activeMembers ? `${Math.round((view.trainedThisWeek / view.activeMembers) * 100)}% de tus socios` : undefined} />
        <Stat label={`Sin entrenar hace ${INACTIVE_DAYS}+ días`} value={view.inactiveCount} sub="En riesgo de irse" alert={view.inactiveCount > 0} />
        <Stat label="Cupo usado" value={`${pct}%`} sub={full ? 'Cupo lleno' : undefined} alert={full} />
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Código para tus socios</p>
        <p className="select-all font-mono text-3xl font-bold tracking-widest">{view.inviteCode ? formatGymCode(view.inviteCode) : '—'}</p>
        <p className="text-xs text-muted-foreground">
          Compartilo en recepción o por tu grupo de socios. Lo ingresan en Forza AI, en Ajustes, en Gimnasio, y usan la app sin pagar.
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        {full ? <p className="text-xs text-warning">Cupo lleno: para sumar más socios, escribinos a gimnasios@forzaai.app.</p> : null}
      </div>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Para llamar esta semana</h2>
          <Link href="/gym/socios" className="text-xs text-muted-foreground underline hover:text-foreground">
            Ver todos los socios
          </Link>
        </div>
        {atRisk.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">
            {view.sharedMembers.length === 0
              ? 'Cuando tus socios compartan su nombre, acá ves a los que llevan días sin entrenar.'
              : 'Ninguno de tus socios pasó los 10 días sin entrenar. ¡Bien!'}
          </p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {atRisk.map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">{m.name}</span>
                <Badge variant="warning">
                  {m.daysSinceLastWorkout === null ? `no entrenó desde que entró (hace ${m.joinedDaysAgo} d)` : `hace ${m.daysSinceLastWorkout} días`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
