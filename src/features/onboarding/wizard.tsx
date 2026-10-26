'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dumbbell, Salad, Sparkles, Target, User, UtensilsCrossed } from 'lucide-react';
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
  StepPreferences,
  StepSummary,
  StepTraining,
  StepWeightGoal,
  type StepProps,
} from './steps';

// Cinco pasos: lo esencial primero; comidas, alergias y lesiones van juntas y se pueden saltear.
const STEP_KEYS = ['about', 'weightGoal', 'training', 'preferences', 'summary'] as const;
const OPTIONAL_STEP = 3;

const STEP_COMPONENTS: Array<(p: StepProps) => React.JSX.Element> = [
  StepAbout,
  StepWeightGoal,
  StepTraining,
  StepPreferences,
  StepSummary,
];

const STEP_ICONS = [User, Target, Dumbbell, Salad, Sparkles];

/** Pantalla de bienvenida: qué se va a llevar la persona, antes de pedirle datos. */
function Intro({ onStart }: { onStart: () => void }) {
  const t = useT();
  const i = t.onboarding.intro;
  const points = [
    { icon: Dumbbell, title: i.b1Title, desc: i.b1Desc },
    { icon: UtensilsCrossed, title: i.b2Title, desc: i.b2Desc },
    { icon: Sparkles, title: i.b3Title, desc: i.b3Desc },
  ];
  return (
    <div className="space-y-8 pt-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Dumbbell className="size-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{i.title}</h1>
        <p className="text-sm text-muted-foreground">{i.subtitle}</p>
      </div>
      <ul className="space-y-3">
        {points.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-3 rounded-xl border bg-card p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <Button size="lg" className="h-12 w-full text-base font-bold" onClick={onStart}>
          {i.cta}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{i.note}</p>
      </div>
    </div>
  );
}

export function OnboardingWizard({
  initial,
}: {
  initial: Pick<OnboardingData, 'name' | 'unitSystem' | 'locale'>;
}) {
  const t = useT();
  const [intro, setIntro] = useState(true);
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
    sportPriority: null,
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
    if (step === 0) {
      setIntro(true);
      return;
    }
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
  const StepIcon = STEP_ICONS[step]!;

  if (intro) return <Intro onStart={() => setIntro(false)} />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{interpolate(t.onboarding.stepOf, { n: step + 1, total: STEP_KEYS.length })}</span>
        </div>
        <Progress value={progress} />
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <StepIcon className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
      </div>

      <Step data={data} patch={patch} t={t} errors={errors} />

      {step === OPTIONAL_STEP ? (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep(step + 1)}>
          {t.onboarding.skip}
        </Button>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" size="lg" onClick={back} disabled={pending} className="flex-1">
          {t.common.back}
        </Button>
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
