import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { getApprovedInviteFor } from '@/server/gyms';
import { InviteAccept } from '@/features/gym/invite-accept';

export const metadata: Metadata = { title: 'Invitación de tu gimnasio' };
export const dynamic = 'force-dynamic';

export default async function InvitePage() {
  const ctx = await requireUser();
  const invite = await getApprovedInviteFor(ctx.userId, ctx.email);
  // Sin invitación aprobada para este mail (o si ya es socio): a la app.
  if (!invite) redirect('/dashboard');
  return <InviteAccept inviteId={invite.inviteId} gymName={invite.gymName} />;
}
