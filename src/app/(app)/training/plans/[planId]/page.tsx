import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getPlanEditor } from '@/features/training/queries';
import { PlanEditorView } from '@/features/training/plan-editor';

export const metadata: Metadata = { title: 'Rutina' };

export default async function PlanEditorPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const [{ t }, ctx, { planId }] = await Promise.all([getT(), requireUser(), params]);
  const plan = await getPlanEditor(ctx.profile, planId);
  if (!plan) notFound();

  return (
    <div className="space-y-4">
      <Link
        href="/training"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.training.title}
      </Link>
      <PlanEditorView plan={plan} />
    </div>
  );
}
