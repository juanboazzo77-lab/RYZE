import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getExerciseProgress } from '@/features/training/history-queries';
import { ExerciseProgressView } from '@/features/training/exercise-progress-view';

export const metadata: Metadata = { title: 'Progreso del ejercicio' };

const RANGE_DAYS: Record<string, number> = { '30': 30, '90': 90, '180': 180, '365': 365, all: 3650 };

export default async function ExerciseProgressPage({
  params,
  searchParams,
}: {
  params: Promise<{ exerciseId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [{ t }, ctx, { exerciseId }, sp] = await Promise.all([
    getT(),
    requireUser(),
    params,
    searchParams,
  ]);
  const days = RANGE_DAYS[sp.range ?? '365'] ?? 365;
  const data = await getExerciseProgress(ctx.profile, exerciseId, days);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/training/history"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.training.history.title}
      </Link>
      <ExerciseProgressView data={data} />
    </div>
  );
}
