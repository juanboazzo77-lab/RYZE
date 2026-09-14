'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/form/field';
import { Segmented } from '@/components/form/segmented';
import { ChipMulti } from '@/components/form/chip-multi';
import { OptionCards } from '@/components/form/option-cards';
import { NumberStepper } from '@/components/form/number-stepper';
import { TagInput } from '@/components/form/tag-input';
import type { Sex } from '@prisma/client';
import * as S from './schema';
import type { CoachProfileData, SectionKey } from './schema';
import { saveCoachProfile } from './actions';

type OptMap = Record<string, string>;
const optList = <T extends string>(vals: readonly T[], map: OptMap) =>
  vals.map((v) => ({ value: v, label: map[v] ?? v }));

export function CoachProfileForm({
  initial,
  sex,
}: {
  initial: CoachProfileData;
  sex: Sex | null;
}) {
  const t = useT();
  const c = t.coachProfile;
  const [d, setD] = useState<CoachProfileData>(initial);
  const [pending, start] = useTransition();

  function set<K extends SectionKey>(k: K, patch: Partial<CoachProfileData[K]>) {
    setD((x) => {
      const next = { ...x };
      next[k] = { ...x[k], ...patch };
      return next;
    });
  }

  const completion = useMemo(() => S.coachProfileCompletion(d), [d]);

  function save() {
    start(async () => {
      try {
        const res = await saveCoachProfile(d);
        if (res.ok) toast.success(c.savedToast);
        else toast.error(t.onboarding.errors.generic);
      } catch {
        // fallo de red / timeout: no romper la pantalla, dejar reintentar
        toast.error(t.onboarding.errors.generic);
      }
    });
  }

  const h = d.health;
  const f = d.food;
  const tr = d.training;
  const g = d.goal;
  const ls = d.lifestyle;

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-10 -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur md:top-0">
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{c.navHint}</span>
          <span className="shrink-0 font-medium tabular-nums text-foreground">
            {interpolate(c.progressLabel, { n: completion.pct })}
          </span>
        </div>
        <Progress value={completion.pct} className="mt-1.5" />
      </div>

      {/* ---------------- Salud ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{c.sections.health.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{c.sections.health.desc}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={c.fields.conditions}>
            <ChipMulti
              options={optList(S.HEALTH_CONDITIONS, c.opts.healthConditions)}
              value={h.conditions}
              onChange={(v) => set('health', { conditions: S.toggleNone(h.conditions, v, 'ninguna') })}
            />
          </Field>
          <Field label={c.fields.painAreas}>
            <ChipMulti
              options={optList(S.PAIN_AREAS, c.opts.painAreas)}
              value={h.painAreas}
              onChange={(v) => set('health', { painAreas: S.toggleNone(h.painAreas, v, 'ninguna') })}
            />
          </Field>
          {sex === 'FEMALE' ? (
            <Field label={c.fields.pregnancy}>
              <Segmented
                options={optList(S.PREGNANCY, c.opts.pregnancy)}
                value={h.pregnancy}
                onChange={(v) => set('health', { pregnancy: v })}
              />
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.sleepQuality}>
              <Segmented
                options={optList(S.QUALITY_3, c.opts.quality3)}
                value={h.sleepQuality}
                onChange={(v) => set('health', { sleepQuality: v })}
              />
            </Field>
            <Field label={c.fields.stressLevel}>
              <Segmented
                options={optList(S.LEVEL_3, c.opts.level3)}
                value={h.stressLevel}
                onChange={(v) => set('health', { stressLevel: v })}
              />
            </Field>
          </div>
          <Field label={c.fields.healthNote}>
            <Input
              value={h.note}
              placeholder={c.fields.healthNotePh}
              maxLength={300}
              onChange={(e) => set('health', { note: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Comida ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{c.sections.food.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{c.sections.food.desc}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={c.fields.dietStyle}>
            <OptionCards
              columns={2}
              options={optList(S.DIET_STYLES, c.opts.dietStyles)}
              value={f.dietStyle}
              onChange={(v) => set('food', { dietStyle: v })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.favoriteFoods}>
              <TagInput
                value={f.favoriteFoods}
                placeholder={c.fields.favoriteFoodsPh}
                onChange={(v) => set('food', { favoriteFoods: v })}
              />
            </Field>
            <Field label={c.fields.dislikedFoods}>
              <TagInput
                value={f.dislikedFoods}
                placeholder={c.fields.dislikedFoodsPh}
                onChange={(v) => set('food', { dislikedFoods: v })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.cookingSkill}>
              <Segmented
                options={optList(S.COOKING_SKILL, c.opts.cookingSkill)}
                value={f.cookingSkill}
                onChange={(v) => set('food', { cookingSkill: v })}
              />
            </Field>
            <Field label={c.fields.cookingTime}>
              <Segmented
                options={optList(S.COOKING_TIME, c.opts.cookingTime)}
                value={f.cookingTime}
                onChange={(v) => set('food', { cookingTime: v })}
              />
            </Field>
            <Field label={c.fields.budget}>
              <Segmented
                options={optList(S.BUDGET, c.opts.budget)}
                value={f.budget}
                onChange={(v) => set('food', { budget: v })}
              />
            </Field>
            <Field label={c.fields.eatingOut}>
              <Segmented
                options={optList(S.EATING_OUT, c.opts.eatingOut)}
                value={f.eatingOut}
                onChange={(v) => set('food', { eatingOut: v })}
              />
            </Field>
          </div>
          <Field label={c.fields.supplements}>
            <ChipMulti
              options={optList(S.SUPPLEMENTS, c.opts.supplements)}
              value={f.supplements}
              onChange={(v) => set('food', { supplements: S.toggleNone(f.supplements, v, 'ninguno') })}
            />
          </Field>
          <Field label={c.fields.hungriestTime}>
            <Segmented
              options={optList(S.DAYTIME, c.opts.daytime)}
              value={f.hungriestTime}
              onChange={(v) => set('food', { hungriestTime: v })}
            />
          </Field>
          <Field label={c.fields.hasScale} hint={c.fields.hasScaleHint}>
            <Segmented
              options={optList(S.YES_NO, c.opts.yesNo)}
              value={f.hasScale}
              onChange={(v) => set('food', { hasScale: v })}
            />
          </Field>
          <Field label={c.fields.nonNegotiables}>
            <Input
              value={f.nonNegotiables}
              placeholder={c.fields.nonNegotiablesPh}
              maxLength={300}
              onChange={(e) => set('food', { nonNegotiables: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Entrenamiento ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{c.sections.training.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{c.sections.training.desc}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={c.fields.musclePriorities}>
            <ChipMulti
              options={optList(S.MUSCLE_PRIORITIES, c.opts.musclePriorities)}
              value={tr.musclePriorities}
              onChange={(v) => set('training', { musclePriorities: v })}
            />
          </Field>
          <Field label={c.fields.dislikedExercises}>
            <TagInput
              value={tr.dislikedExercises}
              placeholder={c.fields.dislikedExercisesPh}
              onChange={(v) => set('training', { dislikedExercises: v })}
            />
          </Field>
          <Field label={c.fields.techniqueLevel}>
            <Segmented
              options={optList(S.TECHNIQUE_LEVEL, c.opts.techniqueLevel)}
              value={tr.techniqueLevel}
              onChange={(v) => set('training', { techniqueLevel: v })}
            />
          </Field>
          <Field label={c.fields.marks} hint={c.fields.marksHint}>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{c.fields.squat}</span>
                <NumberStepper
                  value={tr.squatKg ?? 0}
                  min={0}
                  max={400}
                  step={5}
                  suffix="kg"
                  onChange={(v) => set('training', { squatKg: v || null })}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{c.fields.deadlift}</span>
                <NumberStepper
                  value={tr.deadliftKg ?? 0}
                  min={0}
                  max={400}
                  step={5}
                  suffix="kg"
                  onChange={(v) => set('training', { deadliftKg: v || null })}
                />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{c.fields.bench}</span>
                <NumberStepper
                  value={tr.benchKg ?? 0}
                  min={0}
                  max={400}
                  step={5}
                  suffix="kg"
                  onChange={(v) => set('training', { benchKg: v || null })}
                />
              </div>
            </div>
          </Field>
          <Field label={c.fields.homeEquipment}>
            <ChipMulti
              options={optList(S.HOME_EQUIPMENT, c.opts.homeEquipment)}
              value={tr.homeEquipment}
              onChange={(v) => set('training', { homeEquipment: v })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.cardioAttitude}>
              <Segmented
                options={optList(S.CARDIO_ATTITUDE, c.opts.cardioAttitude)}
                value={tr.cardioAttitude}
                onChange={(v) => set('training', { cardioAttitude: v })}
              />
            </Field>
            <Field label={c.fields.jobActivity}>
              <Segmented
                options={optList(S.JOB_ACTIVITY, c.opts.jobActivity)}
                value={tr.jobActivity}
                onChange={(v) => set('training', { jobActivity: v })}
              />
            </Field>
          </div>
          <Field label={c.fields.cardioTypes}>
            <ChipMulti
              options={optList(S.CARDIO_TYPES, c.opts.cardioTypes)}
              value={tr.cardioTypes}
              onChange={(v) => set('training', { cardioTypes: v })}
            />
          </Field>
          <Field label={c.fields.routineStyle}>
            <Segmented
              options={optList(S.ROUTINE_STYLE, c.opts.routineStyle)}
              value={tr.routineStyle}
              onChange={(v) => set('training', { routineStyle: v })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Objetivo ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{c.sections.goal.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{c.sections.goal.desc}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={c.fields.goalInWords}>
            <Textarea
              value={g.goalInWords}
              placeholder={c.fields.goalInWordsPh}
              maxLength={600}
              onChange={(e) => set('goal', { goalInWords: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.targetEvent}>
              <Input
                value={g.targetEvent}
                placeholder={c.fields.targetEventPh}
                maxLength={120}
                onChange={(e) => set('goal', { targetEvent: e.target.value })}
              />
            </Field>
            <Field label={c.fields.targetEventDate}>
              <Input
                type="date"
                value={g.targetEventDate ?? ''}
                onChange={(e) => set('goal', { targetEventDate: e.target.value || null })}
              />
            </Field>
          </div>
          <Field label={c.fields.aggressiveness}>
            <Segmented
              options={optList(S.AGGRESSIVENESS, c.opts.aggressiveness)}
              value={g.aggressiveness}
              onChange={(v) => set('goal', { aggressiveness: v })}
            />
          </Field>
          <Field label={c.fields.mainPriority}>
            <OptionCards
              columns={2}
              options={optList(S.MAIN_PRIORITY, c.opts.mainPriority)}
              value={g.mainPriority}
              onChange={(v) => set('goal', { mainPriority: v })}
            />
          </Field>
          <Field label={c.fields.triedBefore}>
            <Input
              value={g.triedBefore}
              placeholder={c.fields.triedBeforePh}
              maxLength={300}
              onChange={(e) => set('goal', { triedBefore: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      {/* ---------------- Día a día ---------------- */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{c.sections.lifestyle.title}</CardTitle>
          <p className="text-xs text-muted-foreground">{c.sections.lifestyle.desc}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field label={c.fields.scheduleType}>
            <Segmented
              options={optList(S.SCHEDULE_TYPE, c.opts.scheduleType)}
              value={ls.scheduleType}
              onChange={(v) => set('lifestyle', { scheduleType: v })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={c.fields.travelFrequency}>
              <Segmented
                options={optList(S.TRAVEL_FREQ, c.opts.travelFreq)}
                value={ls.travelFrequency}
                onChange={(v) => set('lifestyle', { travelFrequency: v })}
              />
            </Field>
            <Field label={c.fields.consistency}>
              <Segmented
                options={optList(S.CONSISTENCY, c.opts.consistency)}
                value={ls.consistency}
                onChange={(v) => set('lifestyle', { consistency: v })}
              />
            </Field>
            <Field label={c.fields.caregiver}>
              <Segmented
                options={optList(S.YES_NO, c.opts.yesNo)}
                value={ls.caregiver}
                onChange={(v) => set('lifestyle', { caregiver: v })}
              />
            </Field>
            <Field label={c.fields.weekendDifferent}>
              <Segmented
                options={optList(S.YES_NO, c.opts.yesNo)}
                value={ls.weekendDifferent}
                onChange={(v) => set('lifestyle', { weekendDifferent: v })}
              />
            </Field>
          </div>
          <Field label={c.fields.planFreedom}>
            <Segmented
              options={optList(S.PLAN_FREEDOM, c.opts.planFreedom)}
              value={ls.planFreedom}
              onChange={(v) => set('lifestyle', { planFreedom: v })}
            />
          </Field>
          <Field label={c.fields.adjustCadence}>
            <Segmented
              options={optList(S.ADJUST_CADENCE, c.opts.adjustCadence)}
              value={ls.adjustCadence}
              onChange={(v) => set('lifestyle', { adjustCadence: v })}
            />
          </Field>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">{c.saveHint}</p>
      <div className="sticky bottom-16 z-10 md:bottom-0">
        <Button size="lg" className="w-full shadow-lg" onClick={save} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </div>
  );
}
