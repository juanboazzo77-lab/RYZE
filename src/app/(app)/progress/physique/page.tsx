import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { can } from '@/server/entitlements';
import { listPhysiqueAnalyses } from '@/features/physique/queries';
import { PhysiqueClient } from '@/features/physique/physique-client';

export const metadata: Metadata = { title: 'Análisis de físico' };

export default async function PhysiquePage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  const header = (
    <>
      <Link
        href="/progress"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.nav.progress}
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.physique.title}</h1>
        <p className="text-sm text-muted-foreground">{t.physique.subtitle}</p>
      </div>
    </>
  );

  // El análisis de físico suelto está desactivado: se analiza dentro de la revisión semanal.
  if (!can(ctx.entitlement, 'physique_analysis')) redirect('/progress');

  const entries = await listPhysiqueAnalyses(ctx.profile);
  return (
    <div className="space-y-4">
      {header}
      <PhysiqueClient initial={entries} canApplyToCoach={can(ctx.entitlement, 'coach_profile')} />
    </div>
  );
}
