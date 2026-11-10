import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView, INACTIVE_DAYS } from '@/server/owner';
import { countClients, listClients } from '@/server/gym-clients';
import { usedPercent } from '@/features/gym/logic';
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
  const owner = await requireOwnerPage();
  const view = await getOwnerView(owner.userId, owner.gym.id);
  if (!view) redirect('/gym');
  const clients = (await listClients(owner.userId, owner.gym.id)) ?? [];
  const fees = countClients(clients);
  const toCollect = fees.dueToday + fees.overdue + fees.lapsed;
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

      {fees.total > 0 ? (
        <Link href="/gym/clientes" className={`block rounded-xl border p-4 ${toCollect > 0 ? 'border-warning/50 bg-warning/10' : ''}`}>
          <p className="font-semibold">{toCollect > 0 ? `Hoy tenés ${toCollect} ${toCollect === 1 ? 'cuota' : 'cuotas'} para cobrar` : 'Cuotas al día'}</p>
          <p className="text-sm text-muted-foreground">
            {fees.dueToday} vencen hoy · {fees.overdue + fees.lapsed} vencidas · {fees.soon} esta semana · {fees.total} clientes
          </p>
        </Link>
      ) : (
        <Link href="/gym/clientes" className="block rounded-xl border p-4">
          <p className="font-semibold">Controlá las cuotas de tus clientes</p>
          <p className="text-sm text-muted-foreground">Cargá tu lista y te avisamos cada día a quién le toca pagar.</p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Socios" value={view.activeMembers} sub={`de ${view.memberLimit} del cupo`} />
        <Stat label="Entrenaron esta semana" value={view.trainedThisWeek} sub={view.activeMembers ? `${Math.round((view.trainedThisWeek / view.activeMembers) * 100)}% de tus socios` : undefined} />
        <Stat label={`Sin entrenar hace ${INACTIVE_DAYS}+ días`} value={view.inactiveCount} sub="En riesgo de irse" alert={view.inactiveCount > 0} />
        <Stat label="Cupo usado" value={`${pct}%`} sub={full ? 'Cupo lleno' : undefined} alert={full} />
        {view.webMembers > 0 ? <Stat label="Pagan por su cuenta" value={view.webMembers} sub="Llegaron por tu página. No ocupan cupo ni se te cobran." /> : null}
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">Sumá a tus clientes</p>
        <p className="text-sm text-muted-foreground">
          Imprimí tu QR en Invitar y ponelo en el mostrador: cada cliente lo escanea, crea su cuenta, paga su plan por su cuenta y queda conectado a tu gimnasio.
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {view.activeMembers} de {view.memberLimit} lugares usados
        </p>
        {full ? <p className="text-xs text-warning">Cupo lleno: para sumar más socios, escribinos a gimnasios@forzaai.app.</p> : null}
        <Link href="/gym/invitaciones" className="inline-block text-sm font-medium underline">
          Ver mi QR
        </Link>
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
