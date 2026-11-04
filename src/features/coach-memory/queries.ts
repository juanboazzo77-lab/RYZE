import 'server-only';
import { forUser } from '@/server/user-db';
import { MAX_MEMORIES, type MemoryCategory, asMemoryCategory } from './schema';

export interface CoachMemoryItem {
  id: string;
  category: MemoryCategory;
  content: string;
  source: 'CHAT' | 'USER';
  createdAt: string;
}

/** Lo que el coach recuerda de la persona, del más viejo al más nuevo. */
export async function listCoachMemories(userId: string): Promise<CoachMemoryItem[]> {
  const rows = await forUser(userId).coachMemory.findMany({
    orderBy: { createdAt: 'asc' },
    take: MAX_MEMORIES,
    select: { id: true, category: true, content: true, source: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    category: asMemoryCategory(r.category),
    content: r.content,
    source: r.source === 'USER' ? 'USER' : 'CHAT',
    createdAt: r.createdAt.toISOString(),
  }));
}
