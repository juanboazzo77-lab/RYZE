import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView } from '@/server/owner';
import { listClassTypes, listPlans } from '@/server/gym-plans';
import { PlanEditor } from '@/features/owner/plan-editor';

export const metadata: Metadata = { title: 'Planes del gimnasio' };
export const dynamic = 'force-dynamic';

// Ideas para arrancar: el dueño las ajusta antes de guardar.
const SUGGESTIONS = [
  { name: 'Pase libre', description: 'Todas las clases, sin límite', classesMode: 'ALL' as const, weeklyLimit: null },
  { name: '3 veces por semana', description: 'Hasta 3 reservas por semana', classesMode: 'ALL' as const, weeklyLimit: 3 },
  { name: 'Solo musculación', description: 'Sin clases con reserva', classesMode: 'SELECTED' as const, weeklyLimit: null },
];

/** Los planes de pago del gimnasio y a qué clases puede anotarse cada uno. */
export default async function GymPlansPage() {
  const owner = await requireOwnerPage();
  const [view, plans, classTypes] = await Promise.all([getOwnerView(owner.userId, owner.gym.id), listPlans(owner.userId, owner.gym.id), listClassTypes(owner.userId, owner.gym.id)]);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Planes del gimnasio</h1>
        <p className="text-sm text-muted-foreground">
          Cargá los planes de pago que tiene tu gimnasio y decidí qué clases incluye cada uno. Después le asignás un plan a cada cliente en{' '}
          <Link href="/gym/clientes" className="underline">
            Clientes
          </Link>
          : en la app solo puede anotarse a las clases de su plan, y hasta las reservas por semana que le da.
        </p>
      </div>
      <PlanEditor plans={plans ?? []} classTypes={classTypes} currency={view?.currency ?? 'ARS'} suggestions={SUGGESTIONS} />
      <p className="text-xs text-muted-foreground">
        Los clientes sin plan asignado pueden reservar cualquier clase. Para que el plan valga en la app, el mail del cliente en tu lista tiene que ser el mismo que usa en Forza AI.
      </p>
    </div>
  );
}
