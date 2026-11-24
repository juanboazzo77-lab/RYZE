import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { getConsistency } from '@/features/consistency/queries';
import { ConsistencyScreen } from '@/features/consistency/screen';

export const metadata: Metadata = { title: 'Constancia' };

export default async function ConsistencyPage() {
  const [{ t, locale }, ctx] = await Promise.all([getT(), requireUser()]);
  const view = await getConsistency(ctx.profile);
  const firstName = (ctx.profile.name ?? '').trim().split(/\s+/)[0] ?? '';
  return <ConsistencyScreen t={t} locale={locale} view={view} firstName={firstName} />;
}
