import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { aiConfigured } from '@/server/ai/config';
import { usageSnapshot } from '@/server/ai/usage';
import { getLatestPlanDraft } from '@/features/coach/queries';
import { planDraftSchema, type NutritionDraft } from '@/features/coach/plan-schema';
import { NewPlanFlow } from '@/features/coach/new-plan';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Generar plan con IA' };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const [{ t }, ctx, sp] = await Promise.all([getT(), requireUser(), searchParams]);

  const back = (
    <Link
      href="/coach"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {t.coach.title}
    </Link>
  );

  if (!aiConfigured()) {
    return (
      <div className="space-y-4">
        {back}
        <h1 className="text-2xl font-bold tracking-tight">{t.coach.plan.title}</h1>
        <EmptyState title={t.coach.plan.title} description={t.coach.notConfigured} />
      </div>
    );
  }

  const [rawDraft, usage] = await Promise.all([
    getLatestPlanDraft(ctx.userId),
    usageSnapshot(ctx.userId, ctx.entitlement, ctx.profile.timezone),
  ]);

  let initialDraft: React.ComponentProps<typeof NewPlanFlow>['initialDraft'] = null;
  if (rawDraft) {
    const payload = rawDraft.payload as { plan?: unknown; nutrition?: NutritionDraft | null };
    const parsed = planDraftSchema.safeParse(payload.plan);
    if (parsed.success) {
      initialDraft = {
        generationId: rawDraft.id,
        plan: parsed.data,
        nutrition: payload.nutrition ?? null,
      };
    }
  }

  return (
    <div className="space-y-4">
      {back}
      <h1 className="text-2xl font-bold tracking-tight">{t.coach.plan.title}</h1>
      <NewPlanFlow
        initialDraft={initialDraft}
        usage={{ used: usage.plansUsed, limit: usage.plansLimit }}
        autoGenerate={sp.auto === '1'}
      />
    </div>
  );
}
