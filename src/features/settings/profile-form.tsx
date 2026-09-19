'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/form/field';
import { OptionCards } from '@/components/form/option-cards';
import { ChipMulti } from '@/components/form/chip-multi';
import { TagInput } from '@/components/form/tag-input';
import { NumberStepper } from '@/components/form/number-stepper';
import { useT } from '@/i18n/provider';
import { Segmented } from '@/components/form/segmented';
import {
  ACTIVITY_OPTIONS,
  DIETARY_PREF_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  SEX_OPTIONS,
  TRAINING_PLACE_OPTIONS,
} from '@/lib/domain-options';
import { MUSCLE_PRIORITIES, ROUTINE_STYLE } from '@/features/coach-profile/schema';
import { cmToFtIn, ftInToCm } from '@/lib/units';
import { profileUpdateSchema, type ProfileUpdatePayload } from './schema';
import { updateProfile } from './actions';

const round1 = (n: number) => Math.round(n * 10) / 10;

export function ProfileForm({
  initial,
  unitSystem,
}: {
  initial: ProfileUpdatePayload;
  unitSystem: 'METRIC' | 'IMPERIAL';
}) {
  const t = useT();
  const f = t.onboarding.fields;
  const [d, setD] = useState<ProfileUpdatePayload>(initial);
  const [pending, start] = useTransition();
  const patch = (p: Partial<ProfileUpdatePayload>) => setD((x) => ({ ...x, ...p }));
  const imperial = unitSystem === 'IMPERIAL';
  const { ft, in: inch } = cmToFtIn(d.heightCm);

  function save() {
    const parsed = profileUpdateSchema.safeParse(d);
    if (!parsed.success) {
      toast.error(t.onboarding.errors.generic);
      return;
    }
    start(async () => {
      const res = await updateProfile(parsed.data);
      if (res.ok) toast.success(t.profile.saved);
      else toast.error(t.onboarding.errors.generic);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.profile.personal}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={f.name}>
            <Input value={d.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label={f.sex}>
            <OptionCards
              options={SEX_OPTIONS.map((v) => ({ value: v, label: t.enums.sex[v] }))}
              value={d.sex}
              onChange={(sex) => patch({ sex })}
            />
          </Field>
          <Field label={f.birthdate}>
            <Input
              type="date"
              value={d.birthdate}
              max={new Date().toISOString().slice(0, 10)}
              min="1925-01-01"
              onChange={(e) => patch({ birthdate: e.target.value })}
            />
          </Field>
          <Field label={f.height}>
            {imperial ? (
              <div className="flex gap-2">
                <NumberStepper value={ft} min={3} max={8} suffix="ft" onChange={(v) => patch({ heightCm: round1(ftInToCm(v, inch)) })} />
                <NumberStepper value={inch} min={0} max={11} suffix="in" onChange={(v) => patch({ heightCm: round1(ftInToCm(ft, v)) })} />
              </div>
            ) : (
              <NumberStepper value={Math.round(d.heightCm)} min={120} max={230} suffix="cm" onChange={(v) => patch({ heightCm: v })} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.profile.training}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={f.experienceLevel}>
            <OptionCards
              options={EXPERIENCE_OPTIONS.map((v) => ({ value: v, label: t.enums.experienceLevel[v], hint: t.enums.experienceLevelHint[v] }))}
              value={d.experienceLevel}
              onChange={(experienceLevel) => patch({ experienceLevel })}
            />
          </Field>
          <div className="flex flex-wrap gap-6">
            <Field label={f.daysPerWeek}>
              <NumberStepper value={d.daysAvailable} min={1} max={7} onChange={(v) => patch({ daysAvailable: v })} />
            </Field>
            <Field label={f.sessionMinutes}>
              <NumberStepper value={d.sessionMinutes} min={15} max={180} step={15} suffix="min" onChange={(v) => patch({ sessionMinutes: v })} />
            </Field>
          </div>
          <Field label={f.trainingPlace}>
            <OptionCards
              columns={2}
              options={TRAINING_PLACE_OPTIONS.map((v) => ({ value: v, label: t.enums.trainingPlace[v] }))}
              value={d.trainingPlace}
              onChange={(trainingPlace) => patch({ trainingPlace })}
            />
          </Field>
          <Field label={f.equipment}>
            <ChipMulti
              options={EQUIPMENT_OPTIONS.map((v) => ({ value: v, label: t.enums.equipment[v] }))}
              value={d.equipment as (typeof EQUIPMENT_OPTIONS)[number][]}
              onChange={(equipment) => patch({ equipment })}
            />
          </Field>
          <Field label={f.activityLevel}>
            <OptionCards
              options={ACTIVITY_OPTIONS.map((v) => ({ value: v, label: t.enums.activityLevel[v], hint: t.enums.activityLevelHint[v] }))}
              value={d.activityLevel}
              onChange={(activityLevel) => patch({ activityLevel })}
            />
          </Field>
          <Field label={t.coachProfile.fields.musclePriorities}>
            <ChipMulti
              options={MUSCLE_PRIORITIES.map((v) => ({ value: v, label: t.coachProfile.opts.musclePriorities[v] }))}
              value={d.musclePriorities as (typeof MUSCLE_PRIORITIES)[number][]}
              onChange={(musclePriorities) => patch({ musclePriorities })}
            />
          </Field>
          <Field label={t.coachProfile.fields.routineStyle}>
            <Segmented
              options={ROUTINE_STYLE.map((v) => ({ value: v, label: t.coachProfile.opts.routineStyle[v] }))}
              value={d.routineStyle as (typeof ROUTINE_STYLE)[number] | null}
              onChange={(routineStyle) => patch({ routineStyle })}
            />
          </Field>
          <Field label={t.coachProfile.fields.dislikedExercises}>
            <TagInput
              value={d.dislikedExercises}
              placeholder={t.coachProfile.fields.dislikedExercisesPh}
              onChange={(dislikedExercises) => patch({ dislikedExercises })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.profile.nutrition}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={f.mealsPerDay}>
            <NumberStepper value={d.mealsPerDay} min={1} max={10} onChange={(v) => patch({ mealsPerDay: v })} />
          </Field>
          <Field label={f.dietaryPrefs}>
            <ChipMulti
              options={DIETARY_PREF_OPTIONS.map((v) => ({ value: v, label: t.enums.dietaryPref[v] }))}
              value={d.dietaryPrefs as (typeof DIETARY_PREF_OPTIONS)[number][]}
              onChange={(dietaryPrefs) => patch({ dietaryPrefs })}
            />
          </Field>
          <Field label={f.excludedFoods}>
            <TagInput value={d.excludedFoods} placeholder={f.excludedFoodsPh} onChange={(excludedFoods) => patch({ excludedFoods })} />
          </Field>
          <Field label={f.allergies}>
            <TagInput value={d.allergies} placeholder={f.allergiesPh} onChange={(allergies) => patch({ allergies })} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.profile.health}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={f.injuries}>
            <Textarea value={d.injuries} placeholder={f.injuriesPh} onChange={(e) => patch({ injuries: e.target.value })} />
          </Field>
          <Field label={f.trainingNote}>
            <Textarea value={d.trainingExperienceNote} placeholder={f.trainingNotePh} onChange={(e) => patch({ trainingExperienceNote: e.target.value })} />
          </Field>
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
