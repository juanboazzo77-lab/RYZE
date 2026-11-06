import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getOwnerView } from '@/server/gyms';
import { OwnerProfileEditor } from '@/features/gym/owner-profile-editor';

export const metadata: Metadata = { title: 'Equipamiento' };
export const dynamic = 'force-dynamic';

export default async function GymEquipmentPage() {
  const ctx = await requireUser();
  if (!ctx.ownedGym) redirect('/dashboard');
  const view = await getOwnerView(ctx.userId, ctx.ownedGym.id);
  if (!view) redirect('/dashboard');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Equipamiento y especialidad</h1>
      <OwnerProfileEditor specialty={view.specialty} profile={view.profile} />
    </div>
  );
}
