import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getNotificationPrefs } from '@/features/notifications/queries';
import { NotificationToggles } from '@/features/notifications/notification-toggles';

export const metadata: Metadata = { title: 'Notificaciones' };

export default async function NotificationsSettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  const prefs = await getNotificationPrefs(ctx.profile);

  return (
    <div className="space-y-4">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.notifications.title}</h1>
        <p className="text-sm text-muted-foreground">{t.notifications.subtitle}</p>
      </div>
      <NotificationToggles initial={prefs} />
    </div>
  );
}
