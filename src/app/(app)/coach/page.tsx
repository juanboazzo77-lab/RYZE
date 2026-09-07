import type { Metadata } from 'next';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { aiConfigured } from '@/server/ai/config';
import { usageSnapshot } from '@/server/ai/usage';
import { getCoachThread } from '@/features/coach/queries';
import { CoachChat } from '@/features/coach/chat';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = { title: 'AI Coach' };

export default async function CoachPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  if (!aiConfigured()) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t.coach.title}</h1>
        <EmptyState title={t.coach.title} description={t.coach.notConfigured} />
      </div>
    );
  }

  const [thread, usage] = await Promise.all([
    getCoachThread(ctx.userId),
    usageSnapshot(ctx.userId, ctx.entitlement, ctx.profile.timezone),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.coach.title}</h1>
        <p className="text-sm text-muted-foreground">{t.coach.subtitle}</p>
      </div>
      <CoachChat
        initialMessages={thread.messages}
        usage={{ used: usage.coachUsed, limit: usage.coachLimit }}
      />
    </div>
  );
}
