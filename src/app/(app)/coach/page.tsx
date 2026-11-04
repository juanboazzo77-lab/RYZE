import type { Metadata } from 'next';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { aiConfigured } from '@/server/ai/config';
import { usageSnapshot } from '@/server/ai/usage';
import { getCoachThread } from '@/features/coach/queries';
import { CoachChat } from '@/features/coach/chat';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getClientLink } from '@/server/trainers';
import { fill, MANAGED } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'AI Coach' };

export default async function CoachPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  // Conectado con un entrenador: él maneja el seguimiento y la IA no está disponible.
  if (ctx.managedByTrainer) {
    const link = await getClientLink(ctx.userId);
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{MANAGED.coachTitle}</h1>
        <Card className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">{fill(MANAGED.coachText, { name: link?.trainerName ?? 'tu entrenador' })}</p>
          <Button asChild>
            <Link href="/settings/trainer/chat">
              <MessageCircle className="size-4" />
              {MANAGED.coachCta}
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

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
        autoApply={ctx.profile.coachAutoApply}
      />
    </div>
  );
}
