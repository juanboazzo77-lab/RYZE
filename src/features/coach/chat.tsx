'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Check, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { DecimalInput } from '@/components/form/decimal-input';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import type { CoachMessage } from './queries';
import {
  addCoachExerciseToPlan,
  addCoachFoodToToday,
  resetCoachConversation,
  sendCoachMessage,
} from './actions';
import type { CoachExercise, CoachFood } from './reply-schema';

const MEALS = ['BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK'] as const;
type Meal = (typeof MEALS)[number];

/** Comida sugerida según la hora de este momento. */
function mealForNow(): Meal {
  const h = new Date().getHours();
  return h < 11 ? 'BREAKFAST' : h < 15 ? 'LUNCH' : h < 19 ? 'MERIENDA' : 'DINNER';
}

type PlanDayOption = { id: string; name: string };

/** Debajo de la respuesta: pregunta si quiere sumar el ejercicio a un día de su rutina. */
function ExerciseSuggestion({
  exercise,
  planDays,
  onClose,
}: {
  exercise: CoachExercise;
  planDays: PlanDayOption[];
  onClose: () => void;
}) {
  const t = useT();
  const tc = t.coach;
  const cardio = exercise.type === 'CARDIO';
  const [dayId, setDayId] = useState(planDays[0]?.id ?? '');
  const [sets, setSets] = useState<number>(exercise.sets);
  const [repsMin, setRepsMin] = useState<number>(exercise.repsMin);
  const [repsMax, setRepsMax] = useState<number>(exercise.repsMax);
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);

  function add() {
    if (!dayId) return;
    start(async () => {
      const res = await addCoachExerciseToPlan({
        name: exercise.name,
        type: exercise.type,
        sets: Math.max(1, Math.round(sets || 1)),
        repsMin: Math.max(1, Math.round(repsMin || 1)),
        repsMax: Math.max(1, Math.round(repsMax || 1)),
        planDayId: dayId,
      });
      if (res.ok) {
        setAdded(true);
        toast.success(tc.exerciseAdded);
      } else toast.error(res.error === 'ALREADY' ? tc.exerciseAlready : tc.error);
    });
  }

  if (added) {
    return (
      <p className="flex items-center gap-1.5 pl-1 text-xs text-success">
        <Check className="size-3.5" />
        {tc.exerciseAdded}
      </p>
    );
  }

  if (planDays.length === 0) {
    return (
      <div className="max-w-[85%] space-y-2 rounded-2xl border bg-card p-3 text-sm">
        <p className="text-xs text-muted-foreground">{tc.exerciseNoPlan}</p>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/coach/new-plan">{tc.newPlanCta}</Link>
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {tc.foodSkip}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[85%] space-y-2 rounded-2xl border bg-card p-3 text-sm">
      <p className="font-medium">{tc.exerciseAsk}</p>
      <p className="text-xs text-muted-foreground">{exercise.name}</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">{tc.exerciseDay}</span>
          <NativeSelect value={dayId} onChange={(e) => setDayId(e.target.value)} className="h-9 w-40">
            {planDays.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        {cardio ? null : (
          <>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">{tc.exerciseSets}</span>
              <DecimalInput value={sets} onValueChange={(v) => setSets(v ?? 0)} className="h-9 w-16" />
            </label>
            <label className="space-y-1">
              <span className="block text-xs text-muted-foreground">{tc.exerciseReps}</span>
              <span className="flex items-center gap-1">
                <DecimalInput value={repsMin} onValueChange={(v) => setRepsMin(v ?? 0)} className="h-9 w-14" />
                <span className="text-muted-foreground">–</span>
                <DecimalInput value={repsMax} onValueChange={(v) => setRepsMax(v ?? 0)} className="h-9 w-14" />
              </span>
            </label>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={add} disabled={pending || !dayId}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {tc.exerciseAdd}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          {tc.foodSkip}
        </Button>
      </div>
    </div>
  );
}

/** Debajo de la respuesta: pregunta si quiere sumar el alimento al día de hoy y cuánta cantidad. */
function FoodSuggestion({ food, onClose }: { food: CoachFood; onClose: () => void }) {
  const t = useT();
  const tc = t.coach;
  const [grams, setGrams] = useState<number>(Math.round(food.suggestedGrams));
  const [meal, setMeal] = useState<Meal>(mealForNow());
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  const k = (grams || 0) / 100;
  const kcal = Math.round(food.kcalPer100 * k);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  function add() {
    if (!grams || grams <= 0) return;
    start(async () => {
      const res = await addCoachFoodToToday({
        name: food.name,
        kcalPer100: food.kcalPer100,
        proteinPer100: food.proteinPer100,
        carbsPer100: food.carbsPer100,
        fatPer100: food.fatPer100,
        grams,
        mealType: meal,
      });
      if (res.ok) {
        setAdded(true);
        toast.success(tc.foodAdded);
      } else toast.error(tc.error);
    });
  }

  if (added) {
    return (
      <p className="flex items-center gap-1.5 pl-1 text-xs text-success">
        <Check className="size-3.5" />
        {tc.foodAdded}
      </p>
    );
  }

  return (
    <div className="max-w-[85%] space-y-2 rounded-2xl border bg-card p-3 text-sm">
      <p className="font-medium">{tc.foodAsk}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {food.name} · {tc.foodPer100}: {food.kcalPer100} kcal · P {food.proteinPer100} · C {food.carbsPer100} · G {food.fatPer100}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">{tc.foodAmount}</span>
          <DecimalInput value={grams} onValueChange={(v) => setGrams(v ?? 0)} className="h-9 w-24" />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-muted-foreground">{tc.foodMeal}</span>
          <NativeSelect value={meal} onChange={(e) => setMeal(e.target.value as Meal)} className="h-9 w-36">
            {MEALS.map((m) => (
              <option key={m} value={m}>
                {t.nutrition.meals[m]}
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">
        {grams > 0 ? `${kcal} kcal · P ${r1(food.proteinPer100 * k)} · C ${r1(food.carbsPer100 * k)} · G ${r1(food.fatPer100 * k)}` : ''}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={add} disabled={pending || !grams}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {tc.foodAdd}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} disabled={pending}>
          {tc.foodSkip}
        </Button>
      </div>
    </div>
  );
}

interface Props {
  initialMessages: CoachMessage[];
  usage: { used: number; limit: number };
}

export function CoachChat({ initialMessages, usage }: Props) {
  const t = useT();
  const tc = t.coach;
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
  // Alimento sugerido por mensaje de respuesta (sólo vive mientras la pantalla está abierta).
  const [foods, setFoods] = useState<Record<string, CoachFood>>({});
  const [exercises, setExercises] = useState<
    Record<string, { exercise: CoachExercise; planDays: PlanDayOption[] }>
  >({});
  const [draft, setDraft] = useState('');
  const [used, setUsed] = useState(usage.used);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  const atLimit = used >= usage.limit;

  function submit() {
    const text = draft.trim();
    if (!text || pending || atLimit) return;
    const userMsg: CoachMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setDraft('');
    start(async () => {
      const res = await sendCoachMessage({ text });
      if (res.ok && res.data) {
        const replyId = `reply-${Date.now()}`;
        const food = res.data.food;
        if (food) setFoods((f) => ({ ...f, [replyId]: food }));
        const exercise = res.data.exercise;
        if (exercise) {
          setExercises((x) => ({ ...x, [replyId]: { exercise, planDays: res.data!.planDays } }));
        }
        setMessages((m) => [
          ...m,
          {
            id: replyId,
            role: 'assistant',
            content: res.data!.reply,
            createdAt: new Date().toISOString(),
          },
        ]);
        setUsed((n) => n + 1);
      } else {
        setMessages((m) => m.filter((x) => x.id !== userMsg.id));
        setDraft(text);
        toast.error(res.error || tc.error);
      }
    });
  }

  function reset() {
    if (!confirm(tc.resetConfirm)) return;
    start(async () => {
      await resetCoachConversation();
      setMessages([]);
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex items-center justify-between gap-2 pb-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {interpolate(tc.usageToday, { used, limit: usage.limit })}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/coach/new-plan">
              <Sparkles className="size-4" />
              {tc.newPlanCta}
            </Link>
          </Button>
          {messages.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
              <RotateCcw className="size-4" />
              {tc.reset}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 ? (
          <p className="mx-auto max-w-md py-10 text-center text-sm text-muted-foreground">
            {tc.empty}
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="space-y-2">
              <div className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground',
                  )}
                >
                  {m.content}
                </div>
              </div>
              {exercises[m.id] ? (
                <div className="flex justify-start">
                  <ExerciseSuggestion
                    exercise={exercises[m.id]!.exercise}
                    planDays={exercises[m.id]!.planDays}
                    onClose={() =>
                      setExercises((x) => Object.fromEntries(Object.entries(x).filter(([id]) => id !== m.id)))
                    }
                  />
                </div>
              ) : null}
              {foods[m.id] ? (
                <div className="flex justify-start">
                  <FoodSuggestion
                    food={foods[m.id]!}
                    onClose={() =>
                      setFoods((f) => Object.fromEntries(Object.entries(f).filter(([id]) => id !== m.id)))
                    }
                  />
                </div>
              ) : null}
            </div>
          ))
        )}
        {pending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-3.5 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {tc.sending}
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 space-y-1.5 border-t bg-background pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={tc.inputPlaceholder}
            rows={2}
            maxLength={2000}
            disabled={pending || atLimit}
            className="min-h-11 flex-1 resize-none"
          />
          <Button
            onClick={submit}
            disabled={pending || atLimit || !draft.trim()}
            size="icon"
            aria-label={tc.send}
            className="size-11 shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">{tc.disclaimer}</p>
      </div>
    </div>
  );
}
