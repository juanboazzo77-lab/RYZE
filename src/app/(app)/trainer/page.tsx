import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getActiveTrainer, listTrainerClients } from '@/server/trainers';
import { trainerUnreadByClient } from '@/server/trainer-chat';
import { localTodayISO } from '@/lib/date';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ATTENTION_BADGE, CHAT, fill, GOAL_LABEL, relativeDay, TC } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Mis clientes', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TrainerPanelPage() {
  const ctx = await requireUser();
  const trainer = await getActiveTrainer(ctx.userId);
  // Sin un perfil de entrenador aprobado, el panel no existe: se lo manda a pedir acceso.
  if (!trainer) redirect('/settings/trainer');

  const clients = await listTrainerClients(ctx.userId, ctx.profile.timezone);
  const unread = await trainerUnreadByClient(ctx.userId);
  const todayISO = localTodayISO(ctx.profile.timezone);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{TC.panelTitle}</h1>
          <p className="text-sm text-muted-foreground">{fill(TC.panelCount, { n: clients.length })}</p>
        </div>
        <Link href="/settings/trainer" className="text-xs text-muted-foreground hover:text-foreground">
          {TC.inviteTitle}: <span className="font-mono tracking-widest">{trainer.inviteCode}</span>
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">{TC.panelEmpty}</Card>
      ) : (
        <Card className="divide-y">
          {clients.map((c) => (
            <Link key={c.clientId} href={`/trainer/clients/${c.clientId}`} className="block hover:bg-secondary/50">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <Badge variant={ATTENTION_BADGE[c.attention].variant} className={`text-[10px] ${ATTENTION_BADGE[c.attention].className ?? ''}`}>
                      {TC.attention[c.attention]}
                    </Badge>
                    {unread.get(c.clientId) ? (
                      <Badge className="text-[10px]">{fill(CHAT.unread, { n: unread.get(c.clientId) ?? 0 })}</Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.goal ? `${GOAL_LABEL[c.goal] ?? c.goal} · ` : ''}
                    {TC.lastActivity}: {relativeDay(c.lastActivityISO, todayISO)}
                  </p>
                  {c.weightKg != null ? (
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {TC.weight}: {c.weightKg} kg
                      {c.weightChange30Kg != null
                        ? ` (${c.weightChange30Kg > 0 ? '+' : ''}${c.weightChange30Kg} kg ${TC.change30})`
                        : ''}
                    </p>
                  ) : null}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
