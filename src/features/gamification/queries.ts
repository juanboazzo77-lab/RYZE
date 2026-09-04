import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';

export interface AchievementView {
  key: string;
  category: string;
  title: string;
  description: string;
  icon: string | null;
  threshold: number | null;
  progress: number;
  unlockedAt: Date | null;
}

export async function getAchievements(profile: Profile): Promise<AchievementView[]> {
  const db = forUser(profile.id);
  const [catalog, mine] = await db.$transaction([
    db.achievement.findMany({ orderBy: { category: 'asc' } }),
    db.userAchievement.findMany({ select: { achievementKey: true, progress: true, unlockedAt: true } }),
  ]);
  const byKey = new Map(mine.map((m) => [m.achievementKey, m]));

  return catalog.map((a) => {
    const m = byKey.get(a.key);
    return {
      key: a.key,
      category: a.category,
      title: a.title,
      description: a.description,
      icon: a.icon,
      threshold: a.threshold,
      progress: m?.progress ?? 0,
      unlockedAt: m?.unlockedAt ?? null,
    };
  });
}
