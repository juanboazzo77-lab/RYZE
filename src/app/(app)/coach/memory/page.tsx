import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { listCoachMemories } from '@/features/coach-memory/queries';
import { MemoryManager } from '@/features/coach-memory/memory-manager';

export const metadata: Metadata = { title: 'Memoria del coach' };

export default async function CoachMemoryPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const items = await listCoachMemories(ctx.userId);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {t.coach.memory.back}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">{t.coach.memory.title}</h1>
        <p className="text-sm text-muted-foreground">{t.coach.memory.subtitle}</p>
      </div>
      <MemoryManager initial={items} />
    </div>
  );
}
