import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView, INACTIVE_DAYS } from '@/server/owner';
import { countClients, listClients } from '@/server/gym-clients';
import { usedPercent } from '@/features/gym/logic';
import { getBrand } from '@/server/gym-brand';
import { GettingStarted, type StartStep } from '@/features/owner/getting-started';
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
  const [clients, brand] = await Promise.all([listClients(owner.userId, owner.gym.id).then((c) => c ?? []), getBrand(owner.userId, owner.gym.id).catch(() => null)]);
  const fees = countClients(clients);
  const toCollect = fees.dueToday + fees.overdue + fees.lapsed;
  const pct = usedPercent(view.cupoUsed, view.memberLimit);
  const full = view.memberLimit > 0 && view.cupoUsed >= view.memberLimit;
  // En Argentina los clientes entran por el QR y pagan su plan por su cuenta: no hay cupo ni nada que pagar.
  const viaQr = view.currency === 'ARS';
  const viaQrFlow = view.currency === 'ARS';
  const steps: StartStep[] = [
    { href: '/gym/equipamiento', title: 'Cargá tus máquinas', hint: 'La IA arma los planes de tus clientes con lo que tiene tu gimnasio.', done: view.profile.items.length > 0 },
    { href: '/gym/marca', title: 'Subí tu logo y tu color', hint: 'Tus clientes ven tu marca dentro de la app.', done: Boolean(brand?.logoUrl || brand?.color) },
    { href: '/gym/clientes', title: 'Cargá tus clientes', hint: 'Así te avisamos cada día a quién le toca pagar.', done: clients.length > 0 },
    { href: '/gym/invitaciones', title: viaQrFlow ? 'Imprimí tu QR y ponelo en el mostrador' : 'Invitá a tus primeros socios', hint: viaQrFlow ? 'Tus clientes lo escanean, se crean la cuenta y activan su plan.' : 'Cargá sus mails y los invitamos.', done: view.activeMembers > 0 },
  ];
  const atRisk = view.sharedMembers.filter((m) => (m.daysSinceLastWorkout ?? m.joinedDaysAgo) >= INACTIVE_DAYS).slice(0, 5);

  return (
    <div className="space-y-4">
      {view.status === 'PENDING' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Tu gimnasio está en revisión. Apenas lo aprobemos vas a ver acá tu QR para que tus clientes se sumen. Mientras tanto ya podés cargar tus máquinas y tu especialidad en Equipamiento, y armar tus rutinas, clases y retos.
        </p>
      ) : null}

      {view.status === 'SUSPENDED' ? (
        <p className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">
          Tu gimnasio está suspendido: por ahora tus clientes no ven tu marca, rutinas ni clases en la app. Escribinos a gimnasios@forzaai.app.
        </p>
      ) : null}

      <GettingStarted steps={steps} />

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
        <Stat label="Clientes con Forza AI" value={view.activeMembers} sub={viaQr ? 'Conectados a tu gimnasio' : `${view.cupoUsed} de ${view.memberLimit} del cupo`} />
        <Stat label="Entrenaron esta semana" value={view.trainedThisWeek} sub={view.activeMembers ? `${Math.round((view.trainedThisWeek / view.activeMembers) * 100)}% de tus clientes` : undefined} />
        <Stat label={`Sin entrenar hace ${INACTIVE_DAYS}+ días`} value={view.inactiveCount} sub="En riesgo de irse" alert={view.inactiveCount > 0} />
        {viaQr ? (
          <Stat label="Pagan su plan por su cuenta" value={view.webMembers} sub="No te cuestan nada" />
        ) : (
          <Stat label="Cupo usado" value={`${pct}%`} sub={full ? 'Cupo lleno' : undefined} alert={full} />
        )}
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">{viaQr ? 'Sumá a tus clientes con tu QR' : 'Sumá a tus clientes'}</p>
        {viaQr ? (
          <p className="text-sm text-muted-foreground">
            Imprimí tu QR y ponelo en el mostrador: cada cliente lo escanea, crea su cuenta, paga su plan por su cuenta y queda conectado a tu gimnasio. Vos no pagás nada por ellos y ven tu marca, tus rutinas, clases y retos.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Cargá los mails de tus clientes en Invitar. Revisamos el pedido y, cuando lo aprobamos, cada uno recibe tu invitación y un plan de entrenamiento, un plan de dieta por mes y mensajes con la IA.
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {view.cupoUsed} de {view.memberLimit} lugares usados
            </p>
            {full ? <p className="text-xs text-warning">Cupo lleno: para sumar más socios, escribinos a gimnasios@forzaai.app.</p> : null}
          </>
        )}
        <Link href="/gym/invitaciones" className="inline-block text-sm font-medium underline">
          {viaQr ? 'Ver mi QR' : 'Invitar socios'}
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
              ? 'Cuando tus clientes acepten compartir su nombre, acá ves a los que llevan días sin entrenar.'
              : 'Ninguno de tus clientes pasó los 10 días sin entrenar. ¡Bien!'}
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
