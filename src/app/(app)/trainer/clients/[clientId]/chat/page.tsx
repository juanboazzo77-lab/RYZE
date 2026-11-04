import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { requireUser } from '@/server/context';
import { getActiveTrainer } from '@/server/trainers';
import { getTrainerSideChat } from '@/server/trainer-chat';
import { ChatThread } from '@/features/trainer/chat-thread';
import { CHAT, fill } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Chat', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function TrainerClientChatPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const id = z.string().uuid().safeParse(clientId);
  if (!id.success) notFound();

  const ctx = await requireUser();
  const trainer = await getActiveTrainer(ctx.userId);
  if (!trainer) redirect('/settings/trainer');

  // Sin vínculo activo con ese cliente, la página directamente no existe.
  const chat = await getTrainerSideChat(ctx.userId, id.data);
  if (!chat) notFound();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Link
          href={`/trainer/clients/${id.data}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {chat.otherName}
        </Link>
        <h1 className="text-xl font-bold tracking-tight">{fill(CHAT.title, { name: chat.otherName })}</h1>
      </div>
      <ChatThread linkId={chat.linkId} />
    </div>
  );
}
