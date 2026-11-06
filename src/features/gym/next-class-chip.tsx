import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { todayAR, weekdayLabel, weekdayOf } from './classes';

/** Aviso en el inicio: la próxima clase que el socio reservó. */
export function NextClassChip({ booking }: { booking: { name: string; date: string; startTime: string } }) {
  const today = todayAR(new Date());
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const when = booking.date === today ? 'hoy' : booking.date === tomorrow ? 'mañana' : weekdayLabel(weekdayOf(booking.date)).toLowerCase();
  return (
    <Link href="/training/gym/clases" className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-accent">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <CalendarCheck className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">Tu próxima clase: {booking.name}</p>
        <p className="text-xs text-muted-foreground">
          {when} a las {booking.startTime}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-primary">Ver</span>
    </Link>
  );
}
