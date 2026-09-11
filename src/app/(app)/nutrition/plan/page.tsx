import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { can } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import { forUser } from '@/server/user-db';
import { localTodayISO } from '@/lib/date';
import { MealPlanFlow } from '@/features/nutrition/meal-plan-flow';
import { UpsellCard } from '@/components/upsell-card';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'Planificar comidas' };

export default async function MealPlanPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  const back = (
    <Link
      href="/nutrition"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {t.nutrition.title}
    </Link>
  );

  const title = <h1 className="text-2xl font-bold tracking-tight">{t.nutrition.mealPlan.title}</h1>;

  if (!can(ctx.entitlement, 'ai_meal_plan')) {
    return (
      <div className="space-y-4">
        {back}
        {title}
        <UpsellCard
          t={t}
          description={t.nutrition.mealPlan.upsell}
          ctaHref="/settings/plans"
          ctaLabel={t.pro.viewPlans}
        />
      </div>
    );
  }
  if (!aiConfigured()) {
    return (
      <div className="space-y-4">
        {back}
        {title}
        <EmptyState title={t.nutrition.mealPlan.title} description={t.coach.notConfigured} />
      </div>
    );
  }

  const target = await forUser(ctx.userId).nutritionTarget.findFirst({
    where: { active: true },
    select: { kcal: true, proteinG: true, carbsG: true, fatG: true },
  });

  return (
    <div className="space-y-4">
      {back}
      {title}
      {target ? (
        <MealPlanFlow todayISO={localTodayISO(ctx.profile.timezone)} target={target} />
      ) : (
        <EmptyState
          title={t.nutrition.mealPlan.title}
          description={t.nutrition.mealPlan.noTarget}
        />
      )}
    </div>
  );
}
