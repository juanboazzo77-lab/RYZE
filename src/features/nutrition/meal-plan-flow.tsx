'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Download, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { downloadMealPlanPdf } from '@/lib/pdf/meal-plan-pdf';
import type { MealPlan } from './meal-plan-schema';
import { addMealPlanToDay, generateMealPlanAction } from './meal-plan-actions';

type Target = { kcal: number; proteinG: number; carbsG: number; fatG: number };

export function MealPlanFlow({ todayISO, target }: { todayISO: string; target: Target }) {
  const t = useT();
  const tm = t.nutrition.mealPlan;
  const router = useRouter();
  const [brief, setBrief] = useState('');
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [date, setDate] = useState(todayISO);
  const [generating, startGen] = useTransition();
  const [adding, startAdd] = useTransition();

  function generate() {
    startGen(async () => {
      const res = await generateMealPlanAction({ brief });
      if (res.ok && res.data) setPlan(res.data);
      else toast.error(res.error === 'NO_TARGET' ? tm.noTarget : tm.genError);
    });
  }

  function addToDay() {
    if (!plan) return;
    startAdd(async () => {
      const res = await addMealPlanToDay({ date, meals: plan.meals });
      if (res.ok) {
        toast.success(tm.added);
        router.push(`/nutrition?date=${date}`);
      } else toast.error(tm.genError);
    });
  }

  function downloadPdf() {
    if (!plan) return;
    downloadMealPlanPdf({
      plan,
      target,
      dateISO: date,
      mealLabel: (type) => t.nutrition.meals[type],
      t,
    });
  }

  const totals = plan
    ? plan.meals
        .flatMap((m) => m.items)
        .reduce(
          (a, i) => ({
            kcal: a.kcal + i.kcal,
            proteinG: a.proteinG + i.proteinG,
            carbsG: a.carbsG + i.carbsG,
            fatG: a.fatG + i.fatG,
          }),
          { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
        )
    : null;

  return (
    <div className="space-y-4 pb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tm.targetTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm tabular-nums text-muted-foreground">
            {target.kcal} kcal · P {target.proteinG} · C {target.carbsG} · G {target.fatG}
          </p>
          <div className="space-y-1.5">
            <Label>{tm.briefLabel}</Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              maxLength={400}
              placeholder={tm.briefPh}
              rows={2}
            />
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {plan ? tm.regenerate : tm.generate}
          </Button>
        </CardContent>
      </Card>

      {plan ? (
        <>
          {plan.meals.map((m, mi) => (
            <Card key={mi}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t.nutrition.meals[m.type]} — <span className="text-muted-foreground">{m.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y text-sm">
                  {m.items.map((it, ii) => (
                    <li key={ii} className="flex items-center justify-between gap-2 py-2">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{it.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {it.householdMeasure ? `${it.householdMeasure} · ` : ''}
                          {Math.round(it.grams)} g · {Math.round(it.kcal)} kcal · P{' '}
                          {Math.round(it.proteinG)} C {Math.round(it.carbsG)} G {Math.round(it.fatG)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}

          {totals ? (
            <Card>
              <CardContent className="space-y-3 py-3 text-sm">
                <div>
                  <p className="font-medium">{tm.dayTotal}</p>
                  <p className="tabular-nums text-muted-foreground">
                    {Math.round(totals.kcal)} kcal · P {Math.round(totals.proteinG)} · C{' '}
                    {Math.round(totals.carbsG)} · G {Math.round(totals.fatG)}
                    <span className="ml-2 text-xs">
                      ({tm.target}: {target.kcal} · {target.proteinG} · {target.carbsG} · {target.fatG})
                    </span>
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadPdf} className="w-full">
                  <Download className="size-4" />
                  {tm.downloadPdf}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {plan.notes ? (
            <p className="rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">{plan.notes}</p>
          ) : null}

          {plan.shoppingList.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{tm.shopping}</CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard?.writeText(plan.shoppingList.join('\n')).then(
                      () => toast.success(tm.copied),
                      () => {},
                    );
                  }}
                >
                  {tm.copy}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {plan.shoppingList.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 py-3">
              <div className="space-y-1.5">
                <Label>{tm.addDate}</Label>
                <Input
                  type="date"
                  value={date}
                  max={todayISO}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <Button onClick={addToDay} disabled={adding}>
                {adding ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                {tm.addToDay}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
