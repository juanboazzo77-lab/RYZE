import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getActiveTrainer, getClientDetail } from '@/server/trainers';
import { localTodayISO } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ATTENTION_BADGE,
  EXPERIENCE_LABEL,
  GOAL_LABEL,
  MEMORY_CATEGORY_LABEL,
  relativeDay,
  SEX_LABEL,
  TC,
} from '@/features/trainer/copy';
import { RemoveClientButton } from '@/features/trainer/remove-client-button';

export const metadata: Metadata = { title: 'Cliente', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

export default async function TrainerClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const id = z.string().uuid().safeParse(clientId);
  if (!id.success) notFound();

  const ctx = await requireUser();
  const trainer = await getActiveTrainer(ctx.userId);
  if (!trainer) redirect('/settings/trainer');

  // Sin vínculo activo con ese cliente, la página directamente no existe.
  const d = await getClientDetail(ctx.userId, id.data, ctx.profile.timezone);
  if (!d) notFound();
  const todayISO = localTodayISO(ctx.profile.timezone);

  const weightMin = Math.min(...d.weights.map((w) => w.weightKg));
  const weightMax = Math.max(...d.weights.map((w) => w.weightKg));
  const span = Math.max(0.5, weightMax - weightMin);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href="/trainer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {TC.back}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{d.name}</h1>
          <Badge variant={ATTENTION_BADGE[d.attention].variant} className={ATTENTION_BADGE[d.attention].className}>
            {TC.attention[d.attention]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {TC.lastActivity}: {relativeDay(d.lastActivityISO, todayISO)} · {TC.readOnly}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.basicsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <Row label={TC.goalLabel} value={d.basics.goal ? (GOAL_LABEL[d.basics.goal] ?? d.basics.goal) : null} />
          <Row label="Sexo" value={d.basics.sex ? (SEX_LABEL[d.basics.sex] ?? d.basics.sex) : null} />
          <Row label="Edad" value={d.basics.ageYears != null ? `${d.basics.ageYears} años` : null} />
          <Row label="Altura" value={d.basics.heightCm != null ? `${d.basics.heightCm} cm` : null} />
          <Row label="Experiencia" value={d.basics.experience ? (EXPERIENCE_LABEL[d.basics.experience] ?? d.basics.experience) : null} />
          <Row label="Días por semana" value={d.basics.daysAvailable != null ? String(d.basics.daysAvailable) : null} />
          <Row label="Minutos por sesión" value={d.basics.sessionMinutes != null ? String(d.basics.sessionMinutes) : null} />
          <Row label={TC.injuries} value={d.basics.injuries} />
          {d.goal ? (
            <Row
              label="Meta de peso"
              value={`${d.goal.startWeightKg ?? '—'} → ${d.goal.targetWeightKg ?? '—'} kg${d.goal.weeklyRateKg ? ` (${d.goal.weeklyRateKg} kg/sem)` : ''}`}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.weightTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {d.weights.length === 0 ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : (
            <div className="space-y-2">
              <div className="flex h-24 items-end gap-0.5" role="img" aria-label={TC.weightTitle}>
                {d.weights.map((w) => (
                  <div
                    key={w.date}
                    title={`${fmtDate(w.date)}: ${w.weightKg} kg`}
                    className="min-w-[3px] flex-1 rounded-t bg-primary/70"
                    style={{ height: `${20 + ((w.weightKg - weightMin) / span) * 80}%` }}
                  />
                ))}
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                {fmtDate(d.weights[0]!.date)}: {d.weights[0]!.weightKg} kg → {fmtDate(d.weights.at(-1)!.date)}:{' '}
                {d.weights.at(-1)!.weightKg} kg
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.workoutsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {d.workouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TC.noWorkouts}</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.workouts.map((w, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate">{w.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtDate(w.finishedAt)}
                    {w.minutes ? ` · ${w.minutes} min` : ''}
                    {w.effort ? ` · esfuerzo ${w.effort}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.nutritionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {d.target ? (
            <p className="text-xs tabular-nums text-muted-foreground">
              {TC.targetTitle}: {d.target.kcal} kcal · P {d.target.proteinG} · C {d.target.carbsG} · G {d.target.fatG}
            </p>
          ) : null}
          {d.nutritionDays.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TC.noNutrition}</p>
          ) : (
            <ul className="divide-y text-sm">
              {d.nutritionDays.map((n) => (
                <li key={n.date} className="flex items-center justify-between py-2">
                  <span>{fmtDate(n.date)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {n.kcal} kcal · P {n.proteinG} g
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.planTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {!d.plan ? (
            <p className="text-sm text-muted-foreground">{TC.noPlan}</p>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="font-medium">{d.plan.name}</p>
              {d.plan.days.map((day) => (
                <div key={day.name} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.name}</p>
                  <ul className="space-y-0.5">
                    {day.exercises.map((e, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{e.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {e.sets}×{e.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.checkinsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {d.checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TC.noCheckins}</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {d.checkins.map((c) => (
                <li key={c.weekStart} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">Semana del {fmtDate(c.weekStart)}</p>
                  {c.summary ? <p className="whitespace-pre-wrap">{c.summary}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{TC.memoryTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {d.memories.length === 0 ? (
            <p className="text-sm text-muted-foreground">{TC.noMemory}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {d.memories.map((m) => (
                <li key={m.id} className="flex gap-2">
                  <Badge variant="secondary" className="h-fit shrink-0 text-[10px]">
                    {MEMORY_CATEGORY_LABEL[m.category] ?? m.category}
                  </Badge>
                  <span>{m.content}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <RemoveClientButton clientId={id.data} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
