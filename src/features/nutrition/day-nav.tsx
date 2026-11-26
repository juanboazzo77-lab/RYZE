'use client';

import { useRouter } from 'next/navigation';
import { DayNavBar } from './day-nav-bar';

export function DayNav({ dateISO, todayISO }: { dateISO: string; todayISO: string }) {
  const router = useRouter();
  const go = (iso: string) => router.push(iso === todayISO ? '/nutrition' : `/nutrition?date=${iso}`);
  return <DayNavBar dateISO={dateISO} todayISO={todayISO} onGo={go} />;
}
