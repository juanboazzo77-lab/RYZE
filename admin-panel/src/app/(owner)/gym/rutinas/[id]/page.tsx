import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOwnerPage } from '@/lib/owner';
import { getRoutine } from '@/server/gym-routines';
import { RoutineEditor } from '@/features/owner/routine-editor';

export const metadata: Metadata = { title: 'Editar rutina' };
export const dynamic = 'force-dynamic';

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const owner = await requireOwnerPage();
  const { id } = await params;
  const r = /^[0-9a-f-]{36}$/i.test(id) ? await getRoutine(owner.userId, id) : null;
  if (!r) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Editar rutina</h1>
      <RoutineEditor id={r.id} title={r.title} description={r.description} level={r.level} days={r.days} />
    </div>
  );
}
