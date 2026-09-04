import type { Metadata } from 'next';
import Link from 'next/link';
import { DateTime } from 'luxon';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { getCalendarMonth } from '@/features/calendar/queries';
import { MonthGrid } from '@/features/calendar/month-grid';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Calendario' };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ locale }, ctx, sp] = await Promise.all([getT(), requireUser(), searchParams]);
  const currentMonthISO = DateTime.now().setZone(ctx.profile.timezone).toFormat('yyyy-LL');
  const monthISO = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? sp.month! : currentMonthISO;

  const month = await getCalendarMonth(ctx.profile, monthISO);
  const cursor = DateTime.fromISO(`${monthISO}-01`, { zone: 'utc' });
  const prev = cursor.minus({ months: 1 }).toFormat('yyyy-LL');
  const next = cursor.plus({ months: 1 }).toFormat('yyyy-LL');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/calendar?month=${prev}`}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-bold capitalize tracking-tight">
          {cursor.setLocale(locale).toFormat('LLLL yyyy')}
        </h1>
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/calendar?month=${next}`}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <MonthGrid month={month} unitSystem={ctx.profile.unitSystem} />
    </div>
  );
}
