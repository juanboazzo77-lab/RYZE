import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getOwnerView } from '@/server/owner';
import { OwnerProfileEditor } from '@/features/owner/owner-profile-editor';

export const metadata: Metadata = { title: 'Equipamiento' };
export const dynamic = 'force-dynamic';

export default async function GymEquipmentPage() {
  const owner = await requireOwnerPage();
  const view = await getOwnerView(owner.userId, owner.gym.id);
  if (!view) redirect('/gym');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Equipamiento y especialidad</h1>
      <OwnerProfileEditor specialty={view.specialty} profile={view.profile} />
    </div>
  );
}
