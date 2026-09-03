import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getWorkoutSession } from '@/features/training/queries';
import { SessionClient } from '@/features/training/session-client';

export const metadata: Metadata = { title: 'Entrenamiento activo' };

export default async function SessionPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const [ctx, { workoutId }] = await Promise.all([requireUser(), params]);
  const session = await getWorkoutSession(ctx.profile, workoutId);
  if (!session) notFound();
  if (session.status === 'COMPLETED' || session.status === 'SKIPPED') redirect('/training');

  return <SessionClient session={session} />;
}
