import { notFound } from 'next/navigation';
import { getT } from '@/i18n/server';
import { PlansView } from '@/features/billing/plans-view';

/**
 * Vista de la pantalla de planes con datos de ejemplo, SÓLO en desarrollo: sirve para sacar las
 * capturas que piden las tiendas sin usar una cuenta real. En producción no existe (404).
 */
export default async function DevPlansPreview({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { t } = await getT();
  const { platform } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <PlansView
        t={t}
        currentTier="FREE"
        trial={{ inTrial: true, daysLeft: 3 }}
        hasSubscription={false}
        previewPlatform={platform === 'ios' || platform === 'android' ? platform : undefined}
      />
    </div>
  );
}
