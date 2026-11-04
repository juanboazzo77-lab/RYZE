import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getClientSideChat } from '@/server/trainer-chat';
import { ChatThread } from '@/features/trainer/chat-thread';
import { CHAT, fill } from '@/features/trainer/copy';

export const metadata: Metadata = { title: 'Chat', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ClientTrainerChatPage() {
  const ctx = await requireUser();
  const chat = await getClientSideChat(ctx.userId);
  // Sin un entrenador activo no hay chat.
  if (!chat) redirect('/settings/trainer');

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Link href="/settings/trainer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {CHAT.back}
        </Link>
        <h1 className="text-xl font-bold tracking-tight">{fill(CHAT.title, { name: chat.otherName })}</h1>
      </div>
      <ChatThread linkId={chat.linkId} />
    </div>
  );
}
