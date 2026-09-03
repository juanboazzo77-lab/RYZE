import { getT } from '@/i18n/server';
import { PagePlaceholder } from '@/components/page-placeholder';

export default async function ProgressPage() {
  const { t } = await getT();
  return <PagePlaceholder title={t.nav.progress} note="Peso, gráficos y estadísticas — Fases 6-7." />;
}
