'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveClientDiet, startClientRoutine, tellClientUpdated } from './followup-actions';
import { createRoutineWithAi, suggestClientDiet } from './ai-actions';
import { AIC, fill, FU } from './copy';
import type { ClientPlanRow } from '@/server/trainer-followup';

interface Props {
  clientId: string;
  plans: ClientPlanRow[];
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
}

/**
 * Rutina y dieta del cliente: las arma el entrenador (es lo principal) y avisa por el chat. La IA es una
 * ayuda opcional: un borrador de rutina y una sugerencia de objetivos que el entrenador revisa y cambia.
 */
export function RoutineDietPanel({ clientId, plans, target }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [drafting, startDraft] = useTransition();
  const [brief, setBrief] = useState('');
  const [routineName, setRoutineName] = useState('');
  const [kcal, setKcal] = useState(String(target?.kcal ?? ''));
  const [protein, setProtein] = useState(String(target?.proteinG ?? ''));
  const [carbs, setCarbs] = useState(String(target?.carbsG ?? ''));
  const [fat, setFat] = useState(String(target?.fatG ?? ''));
  const [note, setNote] = useState('');

  function createRoutine() {
    if (routineName.trim().length < 2) return;
    start(async () => {
      const res = await startClientRoutine({ clientId, name: routineName });
      if (res.ok && res.data) router.push(`/trainer/clients/${clientId}/routine/${res.data.planId}`);
      else toast.error(FU.error);
    });
  }

  function draftWithAi() {
    startDraft(async () => {
      const res = await createRoutineWithAi({ clientId, brief: brief || undefined });
      if (res.ok && res.data) router.push(`/trainer/clients/${clientId}/routine/${res.data.planId}`);
      else toast.error(res.error === 'LIMIT' ? AIC.draftLimit : `${AIC.draftError}${res.detail ? ` (${res.detail})` : ''}`);
    });
  }

  function suggestDiet() {
    start(async () => {
      const res = await suggestClientDiet({ clientId });
      if (res.ok && res.data) {
        setKcal(String(res.data.kcal));
        setProtein(String(res.data.proteinG));
        setCarbs(String(res.data.carbsG));
        setFat(String(res.data.fatG));
        setNote(res.data.rationale.slice(0, 300));
        toast.success(AIC.suggested);
      } else toast.error(res.error === 'MISSING_DATA' ? AIC.suggestMissing : FU.error);
    });
  }

  function saveDiet() {
    const nums = { kcal: Number(kcal), proteinG: Number(protein), carbsG: Number(carbs), fatG: Number(fat) };
    if (Object.values(nums).some((n) => !Number.isFinite(n))) {
      toast.error(FU.dietInvalid);
      return;
    }
    start(async () => {
      const res = await saveClientDiet({ clientId, ...nums, note: note || undefined });
      if (res.ok) {
        toast.success(FU.savedOk);
        router.refresh();
      } else toast.error(res.error === 'INVALID' ? FU.dietInvalid : FU.error);
    });
  }

  function tell(what: 'routine' | 'diet') {
    start(async () => {
      const res = await tellClientUpdated({ clientId, what });
      if (res.ok) toast.success(FU.told);
      else toast.error(FU.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-sm font-medium">{FU.routinesTitle}</p>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{FU.noRoutines}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {plans.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {p.isActive ? <Badge variant="success" className="text-[10px]">{FU.activeBadge}</Badge> : null}
                  </span>
                  <span className="text-xs text-muted-foreground">{fill(FU.daysCount, { n: p.days })}</span>
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/trainer/clients/${clientId}/routine/${p.id}`}>
                    <Pencil className="size-3.5" />
                    {FU.editRoutine}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input
            value={routineName}
            onChange={(e) => setRoutineName(e.target.value)}
            placeholder={FU.newRoutineName}
            maxLength={60}
            className="flex-1"
          />
          <Button onClick={createRoutine} disabled={pending || routineName.trim().length < 2}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {FU.newRoutine}
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => tell('routine')} disabled={pending}>
          {FU.tellRoutine}
        </Button>

        <div className="space-y-2 rounded-xl border border-dashed p-3">
          <p className="text-sm font-medium">{AIC.draftTitle}</p>
          <p className="text-xs text-muted-foreground">{AIC.draftHelp}</p>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{AIC.draftBrief}</span>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={AIC.draftBriefPlaceholder}
              rows={2}
              maxLength={500}
              disabled={drafting}
            />
          </label>
          <Button variant="outline" onClick={draftWithAi} disabled={drafting || pending}>
            {drafting ? <Loader2 className="size-4 animate-spin" /> : null}
            {drafting ? AIC.drafting : AIC.draftButton}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{FU.dietTitle}</p>
          <Button variant="outline" size="sm" onClick={suggestDiet} disabled={pending}>
            {AIC.suggestDiet}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{FU.kcal}</span>
            <Input inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{FU.protein}</span>
            <Input inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{FU.carbs}</span>
            <Input inputMode="numeric" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{FU.fat}</span>
            <Input inputMode="numeric" value={fat} onChange={(e) => setFat(e.target.value)} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{FU.dietNote}</span>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={FU.dietNotePlaceholder} rows={2} maxLength={300} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveDiet} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {FU.dietSave}
          </Button>
          <Button variant="ghost" onClick={() => tell('diet')} disabled={pending}>
            {FU.tellDiet}
          </Button>
        </div>
      </section>
    </div>
  );
}
