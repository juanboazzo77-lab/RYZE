import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { localTodayISO } from '@/lib/date';
import { ProgressPhotos } from '@/features/progress/photos/progress-photos';

export const metadata: Metadata = { title: 'Fotos de progreso' };

export default async function ProgressPhotosPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);
  return (
    <div className="space-y-4">
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.nav.progress}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.progress.photosTitle}</h1>
        <p className="text-sm text-muted-foreground">{t.progress.photosSubtitle}</p>
      </div>
      <ProgressPhotos todayISO={localTodayISO(ctx.profile.timezone)} />
    </div>
  );
}
