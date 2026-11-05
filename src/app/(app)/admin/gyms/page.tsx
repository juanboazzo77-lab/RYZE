import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { listGymsForAdmin } from '@/server/gyms';
import { GymAdminCard } from '@/features/gym/gym-admin-card';
import { GYM } from '@/features/gym/copy';

export const metadata: Metadata = { title: 'Gimnasios', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminGymsPage() {
  const ctx = await requireUser();
  // Sin ADMIN_EMAILS definido, o con otro mail, la página directamente no existe.
  if (!isAdmin(ctx.email)) notFound();
  const gyms = await listGymsForAdmin();
  const totalMembers = gyms.reduce((s, g) => s + (g.status === 'ACTIVE' ? g.activeMembers : 0), 0);
  const pendingCount = gyms.filter((g) => g.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-3.5" />
        Panel interno
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{GYM.adminTitle}</h1>
        <p className="text-xs text-muted-foreground">
          {gyms.length} gimnasios · {pendingCount} pendientes · {totalMembers} socios en gimnasios activos
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Formulario público para que te contacten: <span className="font-mono">/gimnasios</span>
        </p>
      </div>
      {gyms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{GYM.adminEmpty}</p>
      ) : (
        <div className="space-y-3">
          {gyms.map((g) => (
            <GymAdminCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
