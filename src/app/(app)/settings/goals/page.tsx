import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { computeTargets, ageFromBirthdate } from '@/lib/nutrition/targets';
import { GoalsForm } from '@/features/settings/goals-form';
import type { GoalUpdatePayload } from '@/features/settings/schema';

export const metadata: Metadata = { title: 'Objetivos' };

export default async function GoalsSettingsPage() {
  const [{ t }, { userId, profile }] = await Promise.all([getT(), requireUser()]);

  if (!profile.sex || !profile.birthdate || !profile.activityLevel || !profile.primaryGoal || !profile.heightCm) {
    redirect('/onboarding');
  }

  const db = forUser(userId);
  const [goal, target, lastWeight] = await Promise.all([
    db.goal.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } }),
    db.nutritionTarget.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } }),
    db.weightEntry.findFirst({ orderBy: { date: 'desc' } }),
  ]);

  const currentWeightKg = lastWeight?.weightKg ?? goal?.startWeightKg ?? 70;
  const birthdateStr = profile.birthdate.toISOString().slice(0, 10);

  const computed = computeTargets({
    sex: profile.sex,
    ageYears: ageFromBirthdate(new Date(`${birthdateStr}T00:00:00Z`)),
    heightCm: profile.heightCm,
    weightKg: currentWeightKg,
    activityLevel: profile.activityLevel,
    goal: profile.primaryGoal,
    weeklyRateKg: goal?.weeklyRateKg ?? null,
  });

  const initial: GoalUpdatePayload = {
    primaryGoal: goal?.type ?? profile.primaryGoal,
    targetWeightKg: goal?.targetWeightKg ?? null,
    weeklyRateKg: goal?.weeklyRateKg ?? null,
    kcal: target?.kcal ?? computed.kcal,
    proteinG: target?.proteinG ?? computed.proteinG,
    carbsG: target?.carbsG ?? computed.carbsG,
    fatG: target?.fatG ?? computed.fatG,
    targetSource: target?.source === 'MANUAL' ? 'MANUAL' : 'CALCULATED',
  };

  return (
    <div className="space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.goals.title}</h1>
      <GoalsForm
        initial={initial}
        unitSystem={profile.unitSystem}
        calc={{
          sex: profile.sex,
          birthdate: birthdateStr,
          heightCm: profile.heightCm,
          activityLevel: profile.activityLevel,
          currentWeightKg,
        }}
      />
    </div>
  );
}
