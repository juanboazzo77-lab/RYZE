'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Ban, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import type { PlanDraft, NutritionDraft } from './plan-schema';
import { DAY_OPTIONS, stylesForDays, type PlanStyle } from './plan-styles';
import { acceptGeneratedPlan, discardGeneratedPlan, generatePlan } from './actions';

interface Draft {
  generationId: string;
  plan: PlanDraft;
  nutrition: NutritionDraft | null;
}

export function NewPlanFlow({
  initialDraft,
  usage,
  autoGenerate = false,
  defaultDays = null,
}: {
  initialDraft: Draft | null;
  usage: { used: number; limit: number };
  /** Viene de guardar el perfil de coach: generá apenas se monta, sin que el
   * usuario tenga que tocar nada. No pisa ningún plan activo por sí sola. */
  autoGenerate?: boolean;
  /** Días por semana del perfil: se marcan en la lista como sugerencia. */
  defaultDays?: number | null;
}) {
  const t = useT();
  const tp = t.coach.plan;
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [brief, setBrief] = useState('');
  const [pending, start] = useTransition();
  const [used, setUsed] = useState(usage.used);
  const [refining, setRefining] = useState(false);
  const [genDays, setGenDays] = useState<number | null>(null);
  const atLimit = used >= usage.limit;

  function generate(opts?: { brief?: string; days?: number; style?: PlanStyle }) {
    if (pending || atLimit) return;
    setGenDays(opts?.days ?? null);
    start(async () => {
      const res = await generatePlan({
        brief: (opts?.brief ?? brief).trim(),
        days: opts?.days,
        style: opts?.style,
      });
      if (res.ok && res.data) {
        setDraft(res.data);
        setUsed((n) => n + 1);
      } else {
        toast.error(res.error || t.coach.error);
      }
    });
  }

  useEffect(() => {
    if (autoGenerate && !initialDraft && !atLimit) generate();
    // Sólo al montar: es un disparo único desde ?auto=1, no un efecto reactivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function replaceMarked(excluded: string[]) {
    if (pending || !draft) return;
    const old = draft.generationId;
    start(async () => {
      // Descartar el borrador anterior le devuelve el cupo; el nuevo lo vuelve a usar.
      await discardGeneratedPlan({ generationId: old });
      const res = await generatePlan({ brief: '', excluded });
      if (res.ok && res.data) {
        setDraft(res.data);
      } else {
        setDraft(null);
        setBrief('');
        setRefining(true);
        setUsed((n) => Math.max(0, n - 1));
        toast.error(res.error || t.coach.error);
      }
    });
  }

  if (!draft) {
    return (
      <PlanWizard
        defaultDays={defaultDays}
        refining={refining}
        pending={pending}
        atLimit={atLimit}
        used={used}
        limit={usage.limit}
        generatingDays={genDays}
        onGenerate={generate}
      />
    );
  }

  return (
    <DraftReview
      draft={draft}
      pending={pending}
      onDiscard={() =>
        start(async () => {
          await discardGeneratedPlan({ generationId: draft.generationId });
          toast.message(tp.discarded);
          setDraft(null);
          setBrief('');
          setRefining(true);
          setUsed((n) => Math.max(0, n - 1));
        })
      }
      onReplace={replaceMarked}
      onAccept={(name, applyNutrition, skip, swap) =>
        start(async () => {
          const res = await acceptGeneratedPlan({
            generationId: draft.generationId,
            overrides: { name, applyNutrition, skip, swap },
          });
          if (res.ok) {
            toast.success(tp.accepted);
            router.push('/training');
          } else {
            toast.error(res.error || t.coach.error);
          }
        })
      }
    />
  );
}

function PlanWizard({
  defaultDays,
  refining,
  pending,
  atLimit,
  used,
  limit,
  generatingDays,
  onGenerate,
}: {
  defaultDays: number | null;
  refining: boolean;
  pending: boolean;
  atLimit: boolean;
  used: number;
  limit: number;
  generatingDays: number | null;
  onGenerate: (opts: { brief?: string; days?: number; style?: PlanStyle }) => void;
}) {
  const t = useT();
  const tp = t.coach.plan;
  const [days, setDays] = useState<number | null>(null);
  const [extra, setExtra] = useState('');

  if (pending) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-medium">
          {interpolate(tp.generatingPlan, { n: generatingDays ?? days ?? '' })}
        </p>
      </div>
    );
  }

  const usageLine = (
    <p className="text-xs text-muted-foreground tabular-nums">
      {interpolate(tp.usage, { used, limit })}
    </p>
  );

  if (days === null) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{tp.daysTitle}</h2>
          <p className="text-sm text-muted-foreground">{refining ? tp.refineIntro : tp.daysHint}</p>
        </div>
        <ul className="space-y-2">
          {DAY_OPTIONS.map((n) => (
            <li key={n}>
              <button
                type="button"
                disabled={atLimit}
                onClick={() => setDays(n)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-base font-medium transition-colors active:bg-secondary disabled:opacity-50',
                  defaultDays === n && 'border-primary/60 bg-primary/5',
                )}
              >
                <span>{n === 1 ? tp.dayOne : interpolate(tp.dayMany, { n })}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        {usageLine}
      </div>
    );
  }

  const options = stylesForDays(days);
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setDays(null)}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {tp.changeDays}
      </button>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {tp.styleTitle}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            · {days === 1 ? tp.dayOne : interpolate(tp.dayMany, { n: days })}
          </span>
        </h2>
        <p className="text-sm text-muted-foreground">{interpolate(tp.styleHint, { n: days })}</p>
      </div>
      <ul className="space-y-2">
        {options.map((style) => (
          <li key={style}>
            <button
              type="button"
              disabled={atLimit}
              // Evita que el primer toque sólo cierre el teclado del campo de texto
              // (en iPhone el botón se movía y el toque se perdía).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onGenerate({ days, style, brief: extra })}
              className="flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors active:bg-secondary disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-base font-medium">
                  {tp.styles[style].name}
                  {style === 'coach' ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {tp.recommended}
                    </span>
                  ) : null}
                </span>
                <span className="block text-xs text-muted-foreground">{tp.styles[style].desc}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-1.5">
        <Label htmlFor="extra">{tp.extraLabel}</Label>
        <Textarea
          id="extra"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={tp.briefPlaceholder}
          rows={2}
          maxLength={600}
        />
      </div>
      {usageLine}
    </div>
  );
}

function DraftReview({
  draft,
  pending,
  onAccept,
  onDiscard,
  onReplace,
}: {
  draft: Draft;
  pending: boolean;
  onAccept: (name: string, applyNutrition: boolean, skip: string[], swap: Record<string, string>) => void;
  onDiscard: () => void;
  onReplace: (excluded: string[]) => void;
}) {
  const t = useT();
  const tp = t.coach.plan;
  const [name, setName] = useState(draft.plan.name);
  const [applyNutrition, setApplyNutrition] = useState(Boolean(draft.nutrition));
  // Ejercicios que el usuario marcó como "no puedo" (clave día:ejercicio).
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const totalExercises = draft.plan.days.reduce((n, d) => n + d.exercises.length, 0);
  const allSkipped = skipped.size >= totalExercises;
  // Alternativa elegida por ejercicio (clave día:ejercicio → nombre).
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const skippedNames = draft.plan.days.flatMap((d, i) =>
    d.exercises.filter((_, j) => skipped.has(`${i}:${j}`)).map((e) => e.name),
  );

  function pickOption(key: string, original: string, option: string) {
    setSwaps((prev) => {
      const next = { ...prev };
      if (option === original) delete next[key];
      else next[key] = option;
      return next;
    });
  }

  function toggleSkip(key: string) {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4 pb-20">
      <h2 className="text-lg font-semibold">{tp.reviewTitle}</h2>

      <div className="space-y-1.5">
        <Label htmlFor="plan-name">{tp.nameLabel}</Label>
        <Input id="plan-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>

      {draft.plan.description ? (
        <p className="text-sm text-muted-foreground">{draft.plan.description}</p>
      ) : null}

      <p className="text-xs text-muted-foreground">{tp.cantDoHint}</p>

      <div className="space-y-3">
        {draft.plan.days.map((d, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {d.name}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {tp.weekdayShort[(d.weekday - 1) % 7]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y text-sm">
                {d.exercises.map((e, j) => {
                  const key = `${i}:${j}`;
                  const off = skipped.has(key);
                  const chosen = swaps[key] ?? e.name;
                  const options = e.alternatives?.length ? [e.name, ...e.alternatives] : null;
                  return (
                  <li
                    key={j}
                    className={cn('flex items-center justify-between gap-3 py-2', off && 'opacity-50')}
                  >
                    <span className="min-w-0">
                      <span className={cn('block truncate', off && 'line-through')}>{chosen}</span>
                      {e.note ? (
                        <span className="block text-xs text-muted-foreground">{e.note}</span>
                      ) : null}
                      {e.rationale && chosen === e.name ? (
                        <span className="block text-xs text-primary/80">{e.rationale}</span>
                      ) : null}
                      {options && !off ? (
                        <span className="mt-1.5 flex flex-wrap items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{tp.options}</span>
                          {options.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={pending}
                              aria-pressed={opt === chosen}
                              onClick={() => pickOption(key, e.name, opt)}
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[11px] transition-colors',
                                opt === chosen
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:border-primary/60',
                              )}
                            >
                              {opt}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {e.type === 'CARDIO'
                        ? [
                            e.durationMinutes ? `${e.durationMinutes} min` : null,
                            e.distanceKm ? `${e.distanceKm} km` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : interpolate(tp.setsReps, {
                            sets: e.sets,
                            min: e.repsMin,
                            max: e.repsMax,
                            rir: e.rir,
                            rest: e.restSeconds,
                          })}
                    </span>
                    <button
                      type="button"
                      aria-pressed={off}
                      disabled={pending}
                      onClick={() => toggleSkip(key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                        off
                          ? 'border-destructive/60 bg-destructive/10 text-destructive'
                          : 'text-muted-foreground hover:border-destructive/60 hover:text-destructive',
                      )}
                    >
                      <Ban className="size-3" />
                      {off ? tp.canDo : tp.cantDo}
                    </button>
                    </span>
                  </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {draft.plan.weeklyNote ? (
        <p className="rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
          {draft.plan.weeklyNote}
        </p>
      ) : null}

      {draft.nutrition ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tp.nutritionSuggested}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
              <span className="font-semibold">{draft.nutrition.kcal} kcal</span>
              <span>P {draft.nutrition.proteinG} g</span>
              <span>C {draft.nutrition.carbsG} g</span>
              <span>G {draft.nutrition.fatG} g</span>
            </div>
            {draft.nutrition.rationale ? (
              <p className="text-xs text-muted-foreground">{draft.nutrition.rationale}</p>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={applyNutrition} onCheckedChange={setApplyNutrition} />
              {tp.applyNutrition}
            </label>
          </CardContent>
        </Card>
      ) : null}

      {skipped.size > 0 ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">{interpolate(tp.skippedCount, { n: skipped.size })}</p>
            <p className="text-xs text-muted-foreground">{tp.replaceHint}</p>
            <Button
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => onReplace(skippedNames)}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {tp.replacing}
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {tp.replace}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-[11px] text-muted-foreground">{t.coach.disclaimer}</p>

      <div className="flex gap-2">
        <Button variant="ghost" className="text-destructive" disabled={pending} onClick={onDiscard}>
          {tp.discard}
        </Button>
        <Button
          className="flex-1"
          disabled={pending || allSkipped || name.trim().length < 3}
          onClick={() => onAccept(name.trim(), applyNutrition, [...skipped], swaps)}
        >
          {pending ? tp.accepting : tp.accept}
        </Button>
      </div>
    </div>
  );
}
