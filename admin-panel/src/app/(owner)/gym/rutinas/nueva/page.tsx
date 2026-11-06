import type { Metadata } from 'next';
import { requireOwnerPage } from '@/lib/owner';
import { RoutineEditor } from '@/features/owner/routine-editor';

export const metadata: Metadata = { title: 'Nueva rutina' };

export default async function NewRoutinePage() {
  await requireOwnerPage();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Nueva rutina</h1>
      <RoutineEditor id={null} title="" description="" level={null} days={[]} />
    </div>
  );
}
