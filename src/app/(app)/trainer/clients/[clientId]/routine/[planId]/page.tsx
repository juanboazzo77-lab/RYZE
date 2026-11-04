import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { prisma } from '@/server/db';
import { getActiveTrainer, trainerEditAccess } from '@/server/trainers';
import { getPlanEditor } from '@/features/training/queries';
import { PlanEditorView } from '@/features/training/plan-editor';
import { TellClientButton } from '@/features/trainer/tell-client-button';
import { FU } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Rutina del cliente', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TrainerRoutinePage({
  params,
}: {
  params: Promise<{ clientId: string; planId: string }>;
}) {
  const { clientId, planId } = await params;
  const client = z.string().uuid().safeParse(clientId);
  const plan = z.string().uuid().safeParse(planId);
  if (!client.success || !plan.success) notFound();

  const ctx = await requireUser();
  const trainer = await getActiveTrainer(ctx.userId);
  if (!trainer) redirect('/settings/trainer');
  // Sin vínculo activo y permiso de edición del cliente, la página directamente no existe.
  if (!(await trainerEditAccess(ctx.userId, client.data))) notFound();

  const clientProfile = await prisma.profile.findUnique({ where: { id: client.data } });
  if (!clientProfile) notFound();
  const editor = await getPlanEditor(clientProfile, plan.data);
  if (!editor) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={`/trainer/clients/${client.data}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {FU.backToClient}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{clientProfile.name?.trim() || 'Cliente'}</p>
        <TellClientButton clientId={client.data} />
      </div>
      <PlanEditorView plan={editor} />
    </div>
  );
}
