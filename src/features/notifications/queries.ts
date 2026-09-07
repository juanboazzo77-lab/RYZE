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
  /** Sólo para recordatorios semanales (WEEKLY_CHECKIN): 1 lunes … 7 domingo. */
  dayOfWeek: number | null;
}

export async function getNotificationPrefs(profile: Profile): Promise<NotificationPrefView[]> {
  const db = forUser(profile.id);
  const rows = await db.notificationPreference.findMany({
    select: { kind: true, enabled: true, dayOfWeek: true },
  });
  const byKind = new Map(rows.map((r) => [r.kind, r]));
  return NOTIFICATION_KINDS.map((kind) => {
    const row = byKind.get(kind);
    return {
      kind,
      enabled: row?.enabled ?? true,
      dayOfWeek: row?.dayOfWeek ?? (kind === 'WEEKLY_CHECKIN' ? 1 : null),
    };
  });
}
