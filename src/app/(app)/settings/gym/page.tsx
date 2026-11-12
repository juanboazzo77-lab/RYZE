import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getShareActivity } from '@/server/gyms';
import { MemberGymPanel, type MemberTrial } from '@/features/gym/member-gym-panel';
import { GYM } from '@/features/gym/copy';
import { trialDaysLeft, trialState } from '@/features/gym/trial';

export const metadata: Metadata = { title: 'Gimnasio' };
export const dynamic = 'force-dynamic';

export default async function GymSettingsPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const ctx = await requireUser();
  const { codigo } = await searchParams;
  const shareActivity = ctx.gym ? await getShareActivity(ctx.userId) : false;
  const state = ctx.gym ? trialState(ctx.gym) : 'NONE';
  // Si ya paga un plan, no se le muestra el aviso de prueba.
  const paying = ctx.entitlement.tier !== 'FREE' && !ctx.entitlement.gymAccess;
  const trial: MemberTrial | null = ctx.gym && state !== 'NONE' && !paying ? { state, daysLeft: trialDaysLeft(ctx.gym.trialEndsAt) } : null;
  return (
    <div className="space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Ajustes
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{GYM.memberTitle}</h1>
      <MemberGymPanel gymName={ctx.gym?.name ?? null} gymCode={ctx.gym?.inviteCode ?? null} shareActivity={shareActivity} trial={trial} initialCode={(codigo ?? '').slice(0, 12)} />
    </div>
  );
}
