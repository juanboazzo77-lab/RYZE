'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/form/field';
import { OptionCards } from '@/components/form/option-cards';
import { NumberStepper } from '@/components/form/number-stepper';
import { useT } from '@/i18n/provider';
import { GOAL_OPTIONS } from '@/lib/domain-options';
import { kgToLb, lbToKg } from '@/lib/units';
import { ageFromBirthdate, computeTargets, defaultWeeklyRateKg } from '@/lib/nutrition/targets';
import { GOALS_WITH_TARGET_WEIGHT } from '@/features/onboarding/types';
import { goalUpdateSchema, type GoalUpdatePayload } from './schema';
import { updateGoalAndTargets } from './actions';
import type { ActivityLevel, Sex } from '@prisma/client';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function GoalsForm({
  initial,
  calc,
  unitSystem,
}: {
  initial: GoalUpdatePayload;
  calc: {
    sex: Sex;
    birthdate: string;
    heightCm: number;
    activityLevel: ActivityLevel;
    currentWeightKg: number;
    sportSessionsPerWeek?: number;
  };
  unitSystem: 'METRIC' | 'IMPERIAL';
}) {
  const t = useT();
  const f = t.onboarding.fields;
  const [d, setD] = useState<GoalUpdatePayload>(initial);
  const [pending, start] = useTransition();
  const patch = (p: Partial<GoalUpdatePayload>) => setD((x) => ({ ...x, ...p }));

  const imperial = unitSystem === 'IMPERIAL';
  const wUnit = imperial ? 'lb' : 'kg';
  const toDisp = (kg: number) => (imperial ? round1(kgToLb(kg)) : round1(kg));
  const fromDisp = (v: number) => (imperial ? round1(lbToKg(v)) : v);
  const needsTarget = GOALS_WITH_TARGET_WEIGHT.includes(d.primaryGoal);

  function recalc() {
    const r = computeTargets({
      sex: calc.sex,
      ageYears: ageFromBirthdate(new Date(`${calc.birthdate}T00:00:00Z`)),
      heightCm: calc.heightCm,
      weightKg: calc.currentWeightKg,
      activityLevel: calc.activityLevel,
      goal: d.primaryGoal,
      weeklyRateKg: d.weeklyRateKg,
      sportSessionsPerWeek: calc.sportSessionsPerWeek ?? null,
    });
    patch({ kcal: r.kcal, proteinG: r.proteinG, carbsG: r.carbsG, fatG: r.fatG, targetSource: 'CALCULATED' });
    toast.message(t.goals.recalcApplied);
  }

  function save() {
    const parsed = goalUpdateSchema.safeParse(d);
    if (!parsed.success) {
      toast.error(t.onboarding.errors.generic);
      return;
    }
    start(async () => {
      const res = await updateGoalAndTargets(parsed.data);
      if (res.ok) toast.success(t.goals.savedTargets);
      else toast.error(t.onboarding.errors.generic);
    });
  }

  const sourceLabel =
    d.targetSource === 'MANUAL' ? t.goals.sourceManual : t.goals.sourceCalculated;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.goals.goalSection}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <OptionCards
            columns={2}
            options={GOAL_OPTIONS.map((v) => ({ value: v, label: t.enums.primaryGoal[v] }))}
            value={d.primaryGoal}
            onChange={(primaryGoal) =>
              patch({
                primaryGoal,
                weeklyRateKg: defaultWeeklyRateKg(primaryGoal),
                targetWeightKg: GOALS_WITH_TARGET_WEIGHT.includes(primaryGoal)
                  ? (d.targetWeightKg ?? calc.currentWeightKg)
                  : null,
              })
            }
          />
          {needsTarget ? (
            <div className="flex flex-wrap gap-6">
              <Field label={f.targetWeight}>
                <NumberStepper
                  value={toDisp(d.targetWeightKg ?? calc.currentWeightKg)}
                  min={toDisp(30)}
                  max={toDisp(400)}
                  step={imperial ? 1 : 0.5}
                  suffix={wUnit}
                  onChange={(v) => patch({ targetWeightKg: fromDisp(v) })}
                />
              </Field>
              <Field label={f.weeklyRate} hint={f.weeklyRateHint}>
                <NumberStepper
                  value={toDisp(d.weeklyRateKg ?? 0)}
                  min={0}
                  max={toDisp(1.5)}
                  step={imperial ? 0.25 : 0.1}
                  suffix={`${wUnit}/sem`}
                  onChange={(v) => patch({ weeklyRateKg: v === 0 ? null : fromDisp(v) })}
                />
              </Field>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t.goals.targetsSection}</CardTitle>
            <Badge variant="secondary">{sourceLabel}</Badge>
          </div>
          <CardDescription>{t.goals.manualHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label={`${t.onboarding.summary.calories} (${t.common.kcalUnit})`}>
              <NumberStepper value={d.kcal} min={800} max={8000} step={10} onChange={(v) => patch({ kcal: v, targetSource: 'MANUAL' })} />
            </Field>
            <Field label={`${t.onboarding.summary.protein} (${t.common.gUnit})`}>
              <NumberStepper value={d.proteinG} min={20} max={500} step={5} onChange={(v) => patch({ proteinG: v, targetSource: 'MANUAL' })} />
            </Field>
            <Field label={`${t.onboarding.summary.carbs} (${t.common.gUnit})`}>
              <NumberStepper value={d.carbsG} min={0} max={1200} step={5} onChange={(v) => patch({ carbsG: v, targetSource: 'MANUAL' })} />
            </Field>
            <Field label={`${t.onboarding.summary.fat} (${t.common.gUnit})`}>
              <NumberStepper value={d.fatG} min={10} max={400} step={5} onChange={(v) => patch({ fatG: v, targetSource: 'MANUAL' })} />
            </Field>
          </div>
          <Button variant="outline" onClick={recalc} className="w-full">
            <RefreshCw className="size-4" />
            {t.goals.recalc}
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-16 z-10 md:bottom-0">
        <Button size="lg" className="w-full shadow-lg" onClick={save} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </div>
  );
}
