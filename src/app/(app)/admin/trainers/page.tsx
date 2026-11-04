import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { isAdmin } from '@/server/admin';
import { listTrainersForAdmin } from '@/server/trainers';
import { blockedAttemptsBySender } from '@/server/trainer-chat';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CHAT, fill, TC } from '@/features/trainer/copy';
import { AdminTrainerActions } from '@/features/trainer/admin-trainer-actions';

export const metadata: Metadata = { title: 'Entrenadores', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminTrainersPage() {
  const ctx = await requireUser();
  // Sin ADMIN_EMAILS definido, o con otro mail, la página directamente no existe.
  if (!isAdmin(ctx.email)) notFound();
  const trainers = await listTrainersForAdmin();
  const blocked = await blockedAttemptsBySender(trainers.map((t) => t.userId));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link href="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Panel interno
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{TC.adminTitle}</h1>
      </div>

      {trainers.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">{TC.adminEmpty}</Card>
      ) : (
        <div className="space-y-3">
          {trainers.map((t) => (
            <Card key={t.userId} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.email}</p>
                </div>
                <Badge variant={t.status === 'ACTIVE' ? 'success' : t.status === 'PENDING' ? 'warning' : 'secondary'}>
                  {TC.statuses[t.status]}
                </Badge>
              </div>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{TC.credentialLabel}</dt>
                  <dd>{t.credential ?? '—'}</dd>
                </div>
                {t.bio ? (
                  <div>
                    <dt className="text-xs text-muted-foreground">{TC.bioLabel}</dt>
                    <dd className="whitespace-pre-wrap">{t.bio}</dd>
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {t.clients} clientes · pidió acceso el {new Date(t.createdAt).toLocaleDateString('es-AR')}
                  {blocked.get(t.userId) ? ` · ${fill(CHAT.blockedAttempts, { n: blocked.get(t.userId) ?? 0 })}` : ''}
                </div>
              </dl>
              <AdminTrainerActions userId={t.userId} status={t.status} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
