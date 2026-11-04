import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getClientLink, getTrainerProfile } from '@/server/trainers';
import { clientUnreadCount } from '@/server/trainer-chat';
import { Card } from '@/components/ui/card';
import { LinkWithTrainer, StopSharingButton } from '@/features/trainer/client-section';
import { ApplyAsTrainerForm, InviteCodeCard } from '@/features/trainer/trainer-section';
import { CHAT, fill, TC } from '@/features/trainer/copy';
import { EditPermissionCard } from '@/features/trainer/edit-permission-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';

export const metadata: Metadata = { title: 'Entrenador' };
export const dynamic = 'force-dynamic';

export default async function TrainerSettingsPage() {
  const ctx = await requireUser();
  const link = await getClientLink(ctx.userId);
  const trainer = await getTrainerProfile(ctx.userId);
  const isTrainer = ctx.profile.accountType === 'TRAINER';
  const unread = link ? await clientUnreadCount(ctx.userId) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link href="/settings" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Ajustes
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{TC.pageTitle}</h1>
      </div>

      {isTrainer ? (
        <>
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{TC.trainerTitle}</h2>
          {!trainer ? (
            <>
              <p className="text-sm text-muted-foreground">{TC.trainerIntro}</p>
              <ApplyAsTrainerForm />
            </>
          ) : trainer.status === 'PENDING' ? (
            <Card className="p-4 text-sm">{TC.pending}</Card>
          ) : trainer.status === 'SUSPENDED' ? (
            <Card className="p-4 text-sm text-destructive">{TC.suspended}</Card>
          ) : (
            <div className="space-y-3">
              <InviteCodeCard code={trainer.inviteCode} />
              <Link href="/trainer" className="block">
                <Card className="flex items-center justify-between p-4 text-sm font-medium hover:bg-secondary/50">
                  {TC.panelLink}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Card>
              </Link>
            </div>
          )}
        </section>
        </>
      ) : (
        <>
        <section className="space-y-3">
          <h2 className="text-base font-semibold">{TC.clientTitle}</h2>
          {link ? (
            <div className="space-y-3">
            <Card className="space-y-3 p-4">
              <p className="text-sm">
                {fill(TC.linked, {
                  name: link.trainerName,
                  date: new Date(link.consentAt).toLocaleDateString('es-AR'),
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild>
                  <Link href="/settings/trainer/chat">
                    <MessageCircle className="size-4" />
                    {fill(CHAT.buttonWithName, { name: link.trainerName })}
                  </Link>
                </Button>
                {unread > 0 ? <Badge>{fill(CHAT.unread, { n: unread })}</Badge> : null}
                <StopSharingButton />
              </div>
            </Card>
              <EditPermissionCard canEdit={link.canEdit} requested={link.editRequested} />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{TC.clientIntro}</p>
              <LinkWithTrainer />
            </>
          )}
        </section>

        </>
      )}
    </div>
  );
}
