'use client';

import type { Dictionary } from '@/i18n';
import { Field } from '@/components/form/field';
import { OptionCards } from '@/components/form/option-cards';
import { PhotoPicker } from '@/components/form/photo-picker';
import { ChipMulti } from '@/components/form/chip-multi';
import { TagInput } from '@/components/form/tag-input';
import { NumberStepper } from '@/components/form/number-stepper';
import { Segmented } from '@/components/form/segmented';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  ACTIVITY_OPTIONS,
  COMMON_SPORTS,
  COMPETITION_PRIORITIES,
  DIETARY_PREF_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  SPORT_LEVELS,
  TRAINING_PLACE_OPTIONS,
  defaultEquipmentFor,
} from '@/lib/domain-options';
import { MUSCLE_PRIORITIES, ROUTINE_STYLE } from '@/features/coach-profile/schema';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/lib/units';
import { ageFromBirthdate, computeTargets, defaultWeeklyRateKg } from '@/lib/nutrition/targets';
import type { OnboardingData } from './types';
import { GOALS_WITH_TARGET_WEIGHT } from './types';

export interface StepProps {
  data: OnboardingData;
  patch: (p: Partial<OnboardingData>) => void;
  t: Dictionary;
  errors: Record<string, string>;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ================================================================== */
/* Paso 1 — Sobre vos                                                  */
/* ================================================================== */
export function StepAbout({ data, patch, t, errors }: StepProps) {
  const f = t.onboarding.fields;
  const imperial = data.unitSystem === 'IMPERIAL';
  const age = data.birthdate ? ageFromBirthdate(new Date(`${data.birthdate}T00:00:00Z`)) : null;
  const { ft, in: inch } = cmToFtIn(data.heightCm);

  return (
    <div className="space-y-5">
      <Field label={f.name} htmlFor="ob-name" error={errors.name}>
        <Input id="ob-name" value={data.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>

      <Field label={f.sex} error={errors.sex}>
        <OptionCards
          options={SEX_OPTIONS.map((v) => ({ value: v, label: t.enums.sex[v] }))}
          value={data.sex}
          onChange={(sex) => patch({ sex })}
        />
      </Field>

      <Field
        label={f.birthdate}
        htmlFor="ob-bd"
        error={errors.birthdate}
        hint={age !== null ? `${f.age}: ${age} ${f.years}` : undefined}
      >
        <Input
          id="ob-bd"
          type="date"
          value={data.birthdate}
          max={new Date().toISOString().slice(0, 10)}
          min="1925-01-01"
          onChange={(e) => patch({ birthdate: e.target.value })}
        />
      </Field>

      <Field label={f.height} error={errors.heightCm}>
        {imperial ? (
          <div className="flex items-center gap-2">
            <NumberStepper value={ft} min={3} max={8} suffix="ft" onChange={(v) => patch({ heightCm: round1(ftInToCm(v, inch)) })} />
            <NumberStepper value={inch} min={0} max={11} suffix="in" onChange={(v) => patch({ heightCm: round1(ftInToCm(ft, v)) })} />
          </div>
        ) : (
          <NumberStepper value={Math.round(data.heightCm)} min={120} max={230} suffix="cm" onChange={(v) => patch({ heightCm: v })} />
        )}
      </Field>
    </div>
  );
}

/* ================================================================== */
/* Paso 2 — Peso y objetivo                                            */
/* ================================================================== */
export function StepWeightGoal({ data, patch, t, errors }: StepProps) {
  const f = t.onboarding.fields;
  const imperial = data.unitSystem === 'IMPERIAL';
  const wUnit = imperial ? 'lb' : 'kg';
  const toDisplay = (kg: number) => (imperial ? round1(kgToLb(kg)) : round1(kg));
  const fromDisplay = (v: number) => (imperial ? round1(lbToKg(v)) : v);
  const needsTarget = data.primaryGoal ? GOALS_WITH_TARGET_WEIGHT.includes(data.primaryGoal) : false;

  function onGoal(goal: OnboardingData['primaryGoal']) {
    if (!goal) return;
    const needs = GOALS_WITH_TARGET_WEIGHT.includes(goal);
    patch({
      primaryGoal: goal,
      weeklyRateKg: defaultWeeklyRateKg(goal),
      targetWeightKg: needs ? (data.targetWeightKg ?? data.currentWeightKg) : null,
    });
  }

  return (
    <div className="space-y-5">
      <Field label={f.currentWeight} error={errors.currentWeightKg}>
        <NumberStepper
          value={toDisplay(data.currentWeightKg)}
          min={toDisplay(30)}
          max={toDisplay(400)}
          step={imperial ? 1 : 0.5}
          suffix={wUnit}
          onChange={(v) => patch({ currentWeightKg: fromDisplay(v) })}
        />
      </Field>

      <Field label={t.goals.goalSection} error={errors.primaryGoal}>
        <OptionCards
          columns={2}
          options={GOAL_OPTIONS.map((v) => ({ value: v, label: t.enums.primaryGoal[v] }))}
          value={data.primaryGoal}
          onChange={onGoal}
        />
      </Field>

      {data.primaryGoal === 'UNDECIDED' ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">{t.onboarding.goalPhotos.title}</p>
          <p className="text-xs text-muted-foreground">{t.onboarding.goalPhotos.hint}</p>
          <PhotoPicker
            value={data.photos}
            onChange={(photos) => patch({ photos })}
            labels={{
              add: t.onboarding.goalPhotos.add,
              remove: t.onboarding.goalPhotos.remove,
              max: t.onboarding.goalPhotos.max,
              error: t.onboarding.goalPhotos.error,
            }}
          />
        </div>
      ) : null}

      {needsTarget ? (
        <Field label={f.targetWeight} error={errors.targetWeightKg}>
          <NumberStepper
            value={toDisplay(data.targetWeightKg ?? data.currentWeightKg)}
            min={toDisplay(30)}
            max={toDisplay(400)}
            step={imperial ? 1 : 0.5}
            suffix={wUnit}
            onChange={(v) => patch({ targetWeightKg: fromDisplay(v) })}
          />
        </Field>
      ) : null}

      {needsTarget ? (
        <Field label={f.weeklyRate} hint={f.weeklyRateHint}>
          <NumberStepper
            value={toDisplay(data.weeklyRateKg ?? 0)}
            min={0}
            max={toDisplay(1.5)}
            step={imperial ? 0.25 : 0.1}
            suffix={`${wUnit}/sem`}
            onChange={(v) => patch({ weeklyRateKg: v === 0 ? null : fromDisplay(v) })}
          />
        </Field>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Paso 3 — Entrenamiento                                              */
/* ================================================================== */
export function StepTraining({ data, patch, t, errors }: StepProps) {
  const f = t.onboarding.fields;
  return (
    <div className="space-y-5">
      <Field label={f.experienceLevel} error={errors.experienceLevel}>
        <OptionCards
          options={EXPERIENCE_OPTIONS.map((v) => ({
            value: v,
            label: t.enums.experienceLevel[v],
            hint: t.enums.experienceLevelHint[v],
          }))}
          value={data.experienceLevel}
          onChange={(experienceLevel) => patch({ experienceLevel })}
        />
      </Field>

      <div className="flex flex-wrap gap-6">
        <Field label={f.daysPerWeek}>
          <NumberStepper value={data.daysAvailable} min={1} max={7} onChange={(v) => patch({ daysAvailable: v })} />
        </Field>
        <Field label={f.sessionMinutes}>
          <NumberStepper value={data.sessionMinutes} min={15} max={180} step={15} suffix="min" onChange={(v) => patch({ sessionMinutes: v })} />
        </Field>
      </div>

      <Field label={f.trainingPlace} error={errors.trainingPlace}>
        <OptionCards
          columns={2}
          options={TRAINING_PLACE_OPTIONS.map((v) => ({ value: v, label: t.enums.trainingPlace[v] }))}
          value={data.trainingPlace}
          onChange={(place) =>
            patch({
              trainingPlace: place,
              equipment: data.equipment.length ? data.equipment : defaultEquipmentFor(place),
            })
          }
        />
      </Field>

      <Field label={f.equipment}>
        <ChipMulti
          options={EQUIPMENT_OPTIONS.map((v) => ({ value: v, label: t.enums.equipment[v] }))}
          value={data.equipment as (typeof EQUIPMENT_OPTIONS)[number][]}
          onChange={(equipment) => patch({ equipment })}
        />
      </Field>

      <Field label={f.activityLevel} error={errors.activityLevel}>
        <OptionCards
          options={ACTIVITY_OPTIONS.map((v) => ({
            value: v,
            label: t.enums.activityLevel[v],
            hint: t.enums.activityLevelHint[v],
          }))}
          value={data.activityLevel}
          onChange={(activityLevel) => patch({ activityLevel })}
        />
      </Field>

      <Field label={t.coachProfile.fields.musclePriorities}>
        <ChipMulti
          options={MUSCLE_PRIORITIES.map((v) => ({ value: v, label: t.coachProfile.opts.musclePriorities[v] }))}
          value={data.musclePriorities as (typeof MUSCLE_PRIORITIES)[number][]}
          onChange={(musclePriorities) => patch({ musclePriorities })}
        />
      </Field>

      <Field label={t.coachProfile.fields.routineStyle}>
        <Segmented
          options={ROUTINE_STYLE.map((v) => ({ value: v, label: t.coachProfile.opts.routineStyle[v] }))}
          value={data.routineStyle as (typeof ROUTINE_STYLE)[number] | null}
          onChange={(routineStyle) => patch({ routineStyle })}
        />
      </Field>

      <Field label={t.coachProfile.fields.dislikedExercises}>
        <TagInput
          value={data.dislikedExercises}
          placeholder={t.coachProfile.fields.dislikedExercisesPh}
          onChange={(dislikedExercises) => patch({ dislikedExercises })}
        />
      </Field>

      <SportSection data={data} patch={patch} t={t} />
    </div>
  );
}

const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function SportSection({ data, patch, t }: Pick<StepProps, 'data' | 'patch' | 't'>) {
  const f = t.onboarding.sport;
  const s = data.sport;
  const patchSport = (p: Partial<OnboardingData['sport']>) => patch({ sport: { ...s, ...p } });
  const patchComp = (p: Partial<OnboardingData['competition']>) =>
    patch({ competition: { ...data.competition, ...p } });

  return (
    <div className="space-y-4 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{f.doesSport}</p>
          <p className="text-xs text-muted-foreground">{f.doesSportHint}</p>
        </div>
        <Switch
          checked={data.doesSport}
          onCheckedChange={(doesSport) => patch({ doesSport })}
          aria-label={f.doesSport}
        />
      </div>

      {data.doesSport ? (
        <div className="space-y-4 border-t pt-4">
          <Field label={f.name}>
            <Input
              list="common-sports"
              value={s.name}
              onChange={(e) => patchSport({ name: e.target.value })}
              placeholder={f.namePh}
            />
            <datalist id="common-sports">
              {COMMON_SPORTS.map((sp) => (
                <option key={sp} value={sp} />
              ))}
            </datalist>
          </Field>

          <Field label={f.level}>
            <Segmented
              options={SPORT_LEVELS.map((v) => ({ value: v, label: t.onboarding.sport.levels[v] }))}
              value={s.level as (typeof SPORT_LEVELS)[number]}
              onChange={(level) => patchSport({ level })}
            />
          </Field>

          <div className="flex flex-wrap items-start gap-6">
            <Field label={f.sessions}>
              <NumberStepper
                value={s.sessionsPerWeek}
                min={0}
                max={14}
                onChange={(sessionsPerWeek) => patchSport({ sessionsPerWeek })}
              />
            </Field>
          </div>

          <Field label={f.days}>
            <ChipMulti
              options={WEEKDAY_SHORT.map((label, i) => ({ value: String(i + 1), label }))}
              value={s.sessionDays.map(String)}
              onChange={(vals) => patchSport({ sessionDays: vals.map(Number).sort((a, b) => a - b) })}
            />
          </Field>

          <Field label={f.goal} hint={f.goalHint}>
            <Input
              value={s.goal}
              onChange={(e) => patchSport({ goal: e.target.value })}
              placeholder={f.goalPh}
            />
          </Field>

          <div className="space-y-3 border-t pt-4">
            <p className="text-sm font-medium">{f.competition}</p>
            <p className="text-xs text-muted-foreground">{f.competitionHint}</p>
            <div className="flex flex-wrap gap-3">
              <Field label={f.compName}>
                <Input
                  value={data.competition.name}
                  onChange={(e) => patchComp({ name: e.target.value })}
                  placeholder={f.compNamePh}
                />
              </Field>
              <Field label={f.compDate}>
                <Input
                  type="date"
                  value={data.competition.date}
                  onChange={(e) => patchComp({ date: e.target.value })}
                />
              </Field>
            </div>
            <Field label={f.compPriority}>
              <Segmented
                options={COMPETITION_PRIORITIES.map((v) => ({
                  value: v,
                  label: t.onboarding.sport.priorities[v],
                }))}
                value={data.competition.priority as (typeof COMPETITION_PRIORITIES)[number]}
                onChange={(priority) => patchComp({ priority })}
              />
            </Field>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/* Paso 4 — Nutrición                                                  */
/* ================================================================== */
export function StepNutrition({ data, patch, t }: StepProps) {
  const f = t.onboarding.fields;
  return (
    <div className="space-y-5">
      <Field label={f.mealsPerDay}>
        <NumberStepper value={data.mealsPerDay} min={1} max={10} onChange={(v) => patch({ mealsPerDay: v })} />
      </Field>

      <Field label={f.dietaryPrefs}>
        <ChipMulti
          options={DIETARY_PREF_OPTIONS.map((v) => ({ value: v, label: t.enums.dietaryPref[v] }))}
          value={data.dietaryPrefs as (typeof DIETARY_PREF_OPTIONS)[number][]}
          onChange={(dietaryPrefs) => patch({ dietaryPrefs })}
        />
      </Field>

      <Field label={f.excludedFoods}>
        <TagInput value={data.excludedFoods} placeholder={f.excludedFoodsPh} onChange={(excludedFoods) => patch({ excludedFoods })} />
      </Field>

      <Field label={f.allergies}>
        <TagInput value={data.allergies} placeholder={f.allergiesPh} onChange={(allergies) => patch({ allergies })} />
      </Field>
    </div>
  );
}

/* ================================================================== */
/* Paso 5 — Salud                                                      */
/* ================================================================== */
export function StepHealth({ data, patch, t }: StepProps) {
  const f = t.onboarding.fields;
  return (
    <div className="space-y-5">
      <Field label={f.injuries}>
        <Textarea value={data.injuries} placeholder={f.injuriesPh} onChange={(e) => patch({ injuries: e.target.value })} />
      </Field>
      <Field label={f.trainingNote}>
        <Textarea
          value={data.trainingExperienceNote}
          placeholder={f.trainingNotePh}
          onChange={(e) => patch({ trainingExperienceNote: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ================================================================== */
/* Paso 6 — Resumen + objetivos estimados                             */
/* ================================================================== */
export function StepSummary({ data, t }: StepProps) {
  const s = t.onboarding.summary;
  const canCompute =
    data.sex && data.birthdate && data.primaryGoal && data.activityLevel && data.heightCm && data.currentWeightKg;

  if (!canCompute) {
    return <p className="text-sm text-muted-foreground">{t.onboarding.errors.generic}</p>;
  }

  const targets = computeTargets({
    sex: data.sex!,
    ageYears: ageFromBirthdate(new Date(`${data.birthdate}T00:00:00Z`)),
    heightCm: data.heightCm,
    weightKg: data.currentWeightKg,
    activityLevel: data.activityLevel!,
    goal: data.primaryGoal!,
    weeklyRateKg: data.weeklyRateKg,
  });

  const phase =
    targets.adjustmentPct < 0 ? s.deficit : targets.adjustmentPct > 0 ? s.surplus : s.maintenance;

  const rows: Array<{ label: string; value: string; color: string }> = [
    { label: s.calories, value: `${targets.kcal} ${t.common.kcalUnit}`, color: 'text-chart-kcal' },
    { label: s.protein, value: `${targets.proteinG} ${t.common.gUnit}`, color: 'text-chart-protein' },
    { label: s.carbs, value: `${targets.carbsG} ${t.common.gUnit}`, color: 'text-chart-carbs' },
    { label: s.fat, value: `${targets.fatG} ${t.common.gUnit}`, color: 'text-chart-fat' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="divide-y p-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">TDEE · {phase}</span>
            <span className="text-sm font-medium tabular-nums">
              {targets.tdee} {t.common.kcalUnit}
              {targets.adjustmentPct !== 0 ? ` (${targets.adjustmentPct > 0 ? '+' : ''}${targets.adjustmentPct}%)` : ''}
            </span>
          </div>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">{r.label}</span>
              <span className={`text-base font-semibold tabular-nums ${r.color}`}>{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{s.basedOn}</p>
      <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">{s.estimateNote}</p>
    </div>
  );
}
