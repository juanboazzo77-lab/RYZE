import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView, INACTIVE_DAYS } from '@/server/owner';
import { countClients, listClients } from '@/server/gym-clients';
import { getBrand } from '@/server/gym-brand';
import { countUnreadNotices } from '@/server/gym-notices';
import { GettingStarted, type StartStep } from '@/features/owner/getting-started';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Panel del gimnasio' };
export const dynamic = 'force-dynamic';

/** Meta: clientes que pagan el plan de Forza AI. El panel funciona completo igual, aunque todavía no se llegue. */
const PLAN_GOAL = 10;

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
  const unreadNotices = await countUnreadNotices(owner.gym.id);
  const [clients, brand] = await Promise.all([listClients(owner.userId, owner.gym.id).then((c) => c ?? []), getBrand(owner.userId, owner.gym.id).catch(() => null)]);
  const fees = countClients(clients);
  const toCollect = fees.dueToday + fees.overdue + fees.lapsed;

  const steps: StartStep[] = [
    { href: '/gym/equipamiento', title: 'Cargá tus máquinas', hint: 'La IA arma los planes de tus clientes con lo que tiene tu gimnasio.', done: view.profile.items.length > 0 },
    { href: '/gym/marca', title: 'Subí tu logo y tu color', hint: 'Tus clientes ven tu marca dentro de la app.', done: Boolean(brand?.logoUrl || brand?.color) },
    { href: '/gym/clientes', title: 'Cargá tus clientes', hint: 'Podés anotarlos en papel y subir una foto. Así te avisamos cada día a quién le toca pagar.', done: clients.length > 0 },
    { href: '/gym/invitaciones', title: 'Imprimí tu QR y ponelo en el mostrador', hint: 'Tus clientes lo escanean, se crean la cuenta y activan su plan.', done: view.activeMembers > 0 },
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

      {unreadNotices > 0 ? (
        <Link href="/gym/avisos" className="block rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="font-semibold">{unreadNotices === 1 ? 'Tenés 1 aviso nuevo de Forza AI' : `Tenés ${unreadNotices} avisos nuevos de Forza AI`}</p>
          <p className="text-sm text-muted-foreground">Tocá para leerlo.</p>
        </Link>
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
        <Stat label="Clientes con Forza AI" value={view.activeMembers} sub="Conectados a tu gimnasio" />
        <Stat label="Entrenaron esta semana" value={view.trainedThisWeek} sub={view.activeMembers ? `${Math.round((view.trainedThisWeek / view.activeMembers) * 100)}% de tus clientes` : undefined} />
        <Stat label={`Sin entrenar hace ${INACTIVE_DAYS}+ días`} value={view.inactiveCount} sub="En riesgo de irse" alert={view.inactiveCount > 0} />
        <Stat label="Pagan su plan por su cuenta" value={view.webMembers} sub="No te cuestan nada" />
      </div>

      <div className="space-y-2 rounded-xl border p-4">
        <p className="font-semibold">Sumá a tus clientes con tu QR</p>
        <>
          <p className="text-sm text-muted-foreground">
            Imprimí tu QR y ponelo en el mostrador: cada cliente lo escanea, crea su cuenta, paga su plan por su cuenta y queda conectado a tu gimnasio. Vos no pagás nada por ellos y ven tu marca, tus rutinas, clases y retos.
          </p>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <p className="font-medium">{view.webMembers >= PLAN_GOAL ? '¡Meta cumplida!' : 'Tu meta: 10 clientes con el plan'}</p>
              <p className="tabular-nums text-muted-foreground">
                {Math.min(view.webMembers, PLAN_GOAL)} de {PLAN_GOAL}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={PLAN_GOAL} aria-valuenow={Math.min(view.webMembers, PLAN_GOAL)} aria-label="Clientes con el plan">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (view.webMembers / PLAN_GOAL) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {view.webMembers >= PLAN_GOAL
                ? 'Ya tenés 10 o más clientes usando el plan. Seguí sumando.'
                : `Ofrecele el plan a tus clientes con tu QR. Te faltan ${PLAN_GOAL - view.webMembers}. Mientras tanto usás todo el panel, aunque tus clientes no usen la app.`}
            </p>
          </div>
        </>
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
