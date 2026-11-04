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
import { askEditPermission, saveClientDiet, startClientRoutine, tellClientUpdated } from './followup-actions';
import { fill, FU } from './copy';
import type { ClientPlanRow } from '@/server/trainer-followup';

interface Props {
  clientId: string;
  canEdit: boolean;
  editRequested: boolean;
  plans: ClientPlanRow[];
  target: { kcal: number; proteinG: number; carbsG: number; fatG: number } | null;
}

/** Rutina y dieta del cliente: crear y editar (con su permiso), y avisarle por el chat. */
export function RoutineDietPanel({ clientId, canEdit, editRequested, plans, target }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [routineName, setRoutineName] = useState('');
  const [kcal, setKcal] = useState(String(target?.kcal ?? ''));
  const [protein, setProtein] = useState(String(target?.proteinG ?? ''));
  const [carbs, setCarbs] = useState(String(target?.carbsG ?? ''));
  const [fat, setFat] = useState(String(target?.fatG ?? ''));
  const [note, setNote] = useState('');

  function ask() {
    start(async () => {
      const res = await askEditPermission({ clientId });
      if (res.ok) {
        toast.success(FU.permissionAsked);
        router.refresh();
      } else toast.error(FU.error);
    });
  }

  function createRoutine() {
    if (routineName.trim().length < 2) return;
    start(async () => {
      const res = await startClientRoutine({ clientId, name: routineName });
      if (res.ok && res.data) router.push(`/trainer/clients/${clientId}/routine/${res.data.planId}`);
      else toast.error(FU.error);
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

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{FU.noPermission}</p>
        {editRequested ? (
          <p className="text-sm font-medium">{FU.permissionPending}</p>
        ) : (
          <Button onClick={ask} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {FU.askPermission}
          </Button>
        )}
      </div>
    );
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
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium">{FU.dietTitle}</p>
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
