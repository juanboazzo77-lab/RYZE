'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import type { PlanDraft, NutritionDraft } from './plan-schema';
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
}: {
  initialDraft: Draft | null;
  usage: { used: number; limit: number };
  /** Viene de guardar el perfil de coach: generá apenas se monta, sin que el
   * usuario tenga que tocar nada. No pisa ningún plan activo por sí sola. */
  autoGenerate?: boolean;
}) {
  const t = useT();
  const tp = t.coach.plan;
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(initialDraft);
  const [brief, setBrief] = useState('');
  const [pending, start] = useTransition();
  const [used, setUsed] = useState(usage.used);
  const [refining, setRefining] = useState(false);
  const atLimit = used >= usage.limit;

  function generate(briefOverride?: string) {
    if (pending || atLimit) return;
    start(async () => {
      const res = await generatePlan({ brief: (briefOverride ?? brief).trim() });
      if (res.ok && res.data) {
        setDraft(res.data);
        setUsed((n) => n + 1);
      } else {
        toast.error(res.error || t.coach.error);
      }
    });
  }

  useEffect(() => {
    if (autoGenerate && !initialDraft && !atLimit) generate('');
    // Sólo al montar: es un disparo único desde ?auto=1, no un efecto reactivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!draft) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{refining ? tp.refineIntro : tp.intro}</p>
        <div className="space-y-1.5">
          <Label htmlFor="brief">{refining ? tp.refineLabel : tp.briefLabel}</Label>
          <Textarea
            id="brief"
            autoFocus={refining}
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={refining ? tp.refinePlaceholder : tp.briefPlaceholder}
            rows={3}
            maxLength={600}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {interpolate(tp.usage, { used, limit: usage.limit })}
          </span>
          <Button onClick={() => generate()} disabled={pending || atLimit}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {tp.generating}
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                {refining ? tp.refineGenerate : tp.generate}
              </>
            )}
          </Button>
        </div>
      </div>
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
        })
      }
      onAccept={(name, applyNutrition) =>
        start(async () => {
          const res = await acceptGeneratedPlan({
            generationId: draft.generationId,
            overrides: { name, applyNutrition },
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

function DraftReview({
  draft,
  pending,
  onAccept,
  onDiscard,
}: {
  draft: Draft;
  pending: boolean;
  onAccept: (name: string, applyNutrition: boolean) => void;
  onDiscard: () => void;
}) {
  const t = useT();
  const tp = t.coach.plan;
  const [name, setName] = useState(draft.plan.name);
  const [applyNutrition, setApplyNutrition] = useState(Boolean(draft.nutrition));

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
                {d.exercises.map((e, j) => (
                  <li key={j} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{e.name}</span>
                      {e.note ? (
                        <span className="block text-xs text-muted-foreground">{e.note}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {interpolate(tp.setsReps, {
                        sets: e.sets,
                        min: e.repsMin,
                        max: e.repsMax,
                        rir: e.rir,
                        rest: e.restSeconds,
                      })}
                    </span>
                  </li>
                ))}
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
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={applyNutrition} onCheckedChange={setApplyNutrition} />
              {tp.applyNutrition}
            </label>
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
          disabled={pending || name.trim().length < 3}
          onClick={() => onAccept(name.trim(), applyNutrition)}
        >
          {pending ? tp.accepting : tp.accept}
        </Button>
      </div>
    </div>
  );
}
