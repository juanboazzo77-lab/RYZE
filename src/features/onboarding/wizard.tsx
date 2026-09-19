'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { ageFromBirthdate } from '@/lib/nutrition/targets';
import { submitOnboarding } from './actions';
import { onboardingSchema } from './schema';
import type { OnboardingData } from './types';
import { GOALS_WITH_TARGET_WEIGHT } from './types';
import {
  StepAbout,
  StepHealth,
  StepNutrition,
  StepSummary,
  StepTraining,
  StepWeightGoal,
  type StepProps,
} from './steps';

const STEP_KEYS = ['about', 'weightGoal', 'training', 'nutrition', 'health', 'summary'] as const;

const STEP_COMPONENTS: Array<(p: StepProps) => React.JSX.Element> = [
  StepAbout,
  StepWeightGoal,
  StepTraining,
  StepNutrition,
  StepHealth,
  StepSummary,
];

export function OnboardingWizard({
  initial,
}: {
  initial: Pick<OnboardingData, 'name' | 'unitSystem' | 'locale'>;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const [data, setData] = useState<OnboardingData>({
    name: initial.name,
    sex: null,
    birthdate: '',
    heightCm: initial.unitSystem === 'IMPERIAL' ? 178 : 170,
    currentWeightKg: 70,
    primaryGoal: null,
    targetWeightKg: null,
    weeklyRateKg: null,
    experienceLevel: null,
    daysAvailable: 3,
    sessionMinutes: 60,
    trainingPlace: null,
    equipment: [],
    activityLevel: null,
    musclePriorities: [],
    dislikedExercises: [],
    routineStyle: null,
    mealsPerDay: 3,
    dietaryPrefs: [],
    excludedFoods: [],
    allergies: [],
    injuries: '',
    trainingExperienceNote: '',
    unitSystem: initial.unitSystem,
    locale: initial.locale,
    photos: [],
    doesSport: false,
    sport: { name: '', level: 'amateur', sessionsPerWeek: 3, sessionDays: [], goal: '' },
    competition: { name: '', date: '', priority: 'B' },
  });

  const patch = (p: Partial<OnboardingData>) => {
    setData((d) => ({ ...d, ...p }));
    setErrors((e) => {
      const keys = Object.keys(p);
      if (!keys.some((k) => k in e)) return e;
      const next = { ...e };
      for (const k of keys) delete next[k];
      return next;
    });
  };

  const stepKey = STEP_KEYS[step]!;
  const meta = t.onboarding.steps[stepKey];
  const Step = STEP_COMPONENTS[step]!;
  const isLast = step === STEP_KEYS.length - 1;

  function validateStep(): boolean {
    const e: Record<string, string> = {};
    const req = t.onboarding.errors.required;
    const pick = t.onboarding.errors.selectOne;

    if (step === 0) {
      if (!data.name.trim()) e.name = req;
      if (!data.sex) e.sex = pick;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birthdate)) {
        e.birthdate = req;
      } else {
        const age = ageFromBirthdate(new Date(`${data.birthdate}T00:00:00Z`));
        if (age < 13 || age > 100) e.birthdate = t.onboarding.errors.ageRange;
      }
      if (data.heightCm < 120 || data.heightCm > 230) e.heightCm = t.onboarding.errors.heightRange;
    }
    if (step === 1) {
      if (data.currentWeightKg < 30 || data.currentWeightKg > 400)
        e.currentWeightKg = t.onboarding.errors.weightRange;
      if (!data.primaryGoal) e.primaryGoal = pick;
      else if (GOALS_WITH_TARGET_WEIGHT.includes(data.primaryGoal)) {
        if (!data.targetWeightKg || data.targetWeightKg < 30 || data.targetWeightKg > 400)
          e.targetWeightKg = t.onboarding.errors.weightRange;
      }
    }
    if (step === 2) {
      if (!data.experienceLevel) e.experienceLevel = pick;
      if (!data.trainingPlace) e.trainingPlace = pick;
      if (!data.activityLevel) e.activityLevel = pick;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validateStep()) return;
    setErrors({});
    setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1));
  }
  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit() {
    const sport =
      data.doesSport && data.sport.name.trim()
        ? {
            name: data.sport.name.trim(),
            level: data.sport.level || undefined,
            sessionsPerWeek: data.sport.sessionsPerWeek,
            sessionDays: data.sport.sessionDays,
            goal: data.sport.goal.trim() || undefined,
          }
        : undefined;
    const competition =
      sport && data.competition.name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(data.competition.date)
        ? {
            name: data.competition.name.trim(),
            date: data.competition.date,
            priority: data.competition.priority as 'A' | 'B' | 'C',
          }
        : undefined;

    const payload = onboardingSchema.safeParse({
      ...data,
      injuries: data.injuries ?? '',
      trainingExperienceNote: data.trainingExperienceNote ?? '',
      photos: data.primaryGoal === 'UNDECIDED' && data.photos.length > 0 ? data.photos : undefined,
      sport,
      competition,
    });
    if (!payload.success) {
      toast.error(t.onboarding.errors.generic);
      return;
    }
    startTransition(async () => {
      const res = await submitOnboarding(payload.data);
      if (res?.error) toast.error(t.onboarding.errors.generic);
    });
  }

  const progress = useMemo(() => ((step + 1) / STEP_KEYS.length) * 100, [step]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{interpolate(t.onboarding.stepOf, { n: step + 1, total: STEP_KEYS.length })}</span>
        </div>
        <Progress value={progress} />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{meta.title}</h1>
          <p className="text-sm text-muted-foreground">{meta.desc}</p>
        </div>
      </div>

      <Step data={data} patch={patch} t={t} errors={errors} />

      <div className="flex gap-3 pt-2">
        {step > 0 ? (
          <Button variant="outline" size="lg" onClick={back} disabled={pending} className="flex-1">
            {t.common.back}
          </Button>
        ) : null}
        {isLast ? (
          <Button size="lg" onClick={submit} disabled={pending} className="flex-1">
            {pending ? t.common.saving : t.onboarding.start}
          </Button>
        ) : (
          <Button size="lg" onClick={next} className="flex-1">
            {t.common.next}
          </Button>
        )}
      </div>
    </div>
  );
}
