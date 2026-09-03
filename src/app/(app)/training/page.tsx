import { getT } from '@/i18n/server';
import { PagePlaceholder } from '@/components/page-placeholder';

export default async function TrainingPage() {
  const { t } = await getT();
  return <PagePlaceholder title={t.nav.train} note="Rutinas y entrenamiento activo — Fase 5." />;
}
