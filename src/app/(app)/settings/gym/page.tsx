import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getShareActivity } from '@/server/gyms';
import { MemberGymPanel } from '@/features/gym/member-gym-panel';
import { GYM } from '@/features/gym/copy';

export const metadata: Metadata = { title: 'Gimnasio' };
export const dynamic = 'force-dynamic';

export default async function GymSettingsPage() {
  const ctx = await requireUser();
  const shareActivity = ctx.gym ? await getShareActivity(ctx.userId) : false;
  return (
    <div className="space-y-4">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Ajustes
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{GYM.memberTitle}</h1>
      <MemberGymPanel gymName={ctx.gym?.name ?? null} shareActivity={shareActivity} />
    </div>
  );
}
