import 'server-only';
import type { NotificationKind, Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';

export const NOTIFICATION_KINDS: NotificationKind[] = [
  'WORKOUT_TODAY',
  'LOG_MEALS',
  'WEIGH_IN',
  'PROTEIN_GOAL',
  'STREAK',
  'WEEKLY_CHECKIN',
];

export interface NotificationPrefView {
  kind: NotificationKind;
  enabled: boolean;
}

export async function getNotificationPrefs(profile: Profile): Promise<NotificationPrefView[]> {
  const db = forUser(profile.id);
  const rows = await db.notificationPreference.findMany({ select: { kind: true, enabled: true } });
  const byKind = new Map(rows.map((r) => [r.kind, r.enabled]));
  return NOTIFICATION_KINDS.map((kind) => ({ kind, enabled: byKind.get(kind) ?? true }));
}
