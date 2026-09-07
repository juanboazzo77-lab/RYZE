import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import type { Dictionary } from '@/i18n';

/** Banner del dashboard: recordatorio de la revisión semanal (día elegido). */
export function CheckinReminder({ t }: { t: Dictionary }) {
  const c = t.dashboard.checkinReminder;
  return (
    <Link
      href="/checkin"
      className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
    >
      <CalendarCheck className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{c.title}</p>
        <p className="text-xs text-muted-foreground">{c.body}</p>
      </div>
      <span className="shrink-0 text-xs font-medium text-primary">{c.cta}</span>
    </Link>
  );
}
