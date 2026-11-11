import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { listClassesForMember, type ClassOccurrenceView } from '@/server/gym-classes';
import { getMemberPlanStatus } from '@/server/gym-plans';
import { describePlan } from '@/features/gym/plans';
import { CANCEL_BEFORE_MINUTES, timeRange, todayAR, weekdayLabel, weekdayOf } from '@/features/gym/classes';
import { ClassButton } from '@/features/gym/class-button';

export const metadata: Metadata = { title: 'Clases del gimnasio' };
export const dynamic = 'force-dynamic';

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

function dayTitle(date: string, today: string): string {
  const wd = weekdayLabel(weekdayOf(date));
  if (date === today) return `Hoy · ${wd} ${fmtDay(date)}`;
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `${date === tomorrow ? 'Mañana' : wd} · ${fmtDay(date)}`;
}

/** Las clases de los próximos 7 días del gimnasio del socio: reservar o cancelar. */
export default async function GymClassesPage() {
  const ctx = await requireUser();
  const now = new Date();
  const [items, planStatus] = ctx.gym
    ? await Promise.all([listClassesForMember(ctx.userId, ctx.gym.gymId, now), getMemberPlanStatus(ctx.userId, ctx.gym.gymId, now)])
    : [[] as ClassOccurrenceView[], { plan: null, usedThisWeek: 0 }];
  const today = todayAR(now);
  const plan = planStatus.plan;
  const planInfo = plan ? describePlan(plan) : null;

  const byDay = new Map<string, ClassOccurrenceView[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  const mine = items.filter((i) => i.state === 'MINE' || i.state === 'MINE_LOCKED');

  return (
    <div className="space-y-4">
      <Link href="/training/gym" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {ctx.gym?.name ?? 'Tu gimnasio'}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clases</h1>
        <p className="text-sm text-muted-foreground">
          Reservá tu lugar hasta con 7 días de anticipación. Podés cancelar hasta {CANCEL_BEFORE_MINUTES / 60} horas antes de que empiece.
        </p>
      </div>

      {plan && planInfo ? (
        <section className="space-y-1 rounded-xl border bg-card p-3 text-sm">
          <p className="font-semibold">Tu plan: {plan.name}</p>
          <p className="text-xs text-muted-foreground">{planInfo.classes}</p>
          <p className="text-xs text-muted-foreground">
            {plan.weeklyLimit === null ? planInfo.weekly : `${planStatus.usedThisWeek} de ${plan.weeklyLimit} reservas usadas esta semana`}
          </p>
        </section>
      ) : null}

      {mine.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Tus reservas</h2>
          <ul className="divide-y rounded-xl border bg-accent">
            {mine.map((m) => (
              <li key={`${m.classId}${m.date}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {dayTitle(m.date, today)} · {m.startTime}
                  </span>
                </span>
                <ClassButton classId={m.classId} date={m.date} state={m.state} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">Tu gimnasio todavía no cargó clases con reserva, o no hay más clases por hoy.</p>
      ) : (
        [...byDay.entries()].map(([date, list]) => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-semibold capitalize">{dayTitle(date, today)}</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {list.map((c) => {
                const left = Math.max(0, c.capacity - c.booked);
                return (
                  <li key={`${c.classId}${c.date}`} className="flex items-center justify-between gap-3 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {timeRange(c.startTime, c.durationMin)}
                        {c.instructor ? ` · ${c.instructor}` : ''}
                      </p>
                      {c.description ? <p className="text-xs text-muted-foreground">{c.description}</p> : null}
                      <p className="mt-0.5 text-xs">{left === 0 ? <span className="text-warning">Completa</span> : <span className="text-muted-foreground">{left === 1 ? 'Queda 1 lugar' : `Quedan ${left} lugares`}</span>}</p>
                    </div>
                    <ClassButton classId={c.classId} date={c.date} state={c.state} inPlan={c.inPlan} />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
