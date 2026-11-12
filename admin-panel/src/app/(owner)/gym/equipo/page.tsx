import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { listStaff } from '@/server/gym-staff';
import { StaffManager } from '@/features/owner/staff-manager';

export const metadata: Metadata = { title: 'Equipo' };
export const dynamic = 'force-dynamic';

/** El equipo del gimnasio: recepción y profes con acceso limitado al panel. Solo lo ve el dueño. */
export default async function GymTeamPage() {
  const owner = await requireOwnerPage();
  const staff = (await listStaff(owner.userId, owner.gym.id)) ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
        <p className="text-sm text-muted-foreground">Dale acceso a tu recepción y a tus profes sin compartir tu contraseña. Cada uno ve solo lo que le corresponde.</p>
      </div>
      <StaffManager staff={staff} />
    </div>
  );
}
