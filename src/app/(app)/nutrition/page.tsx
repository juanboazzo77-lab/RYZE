import { getT } from '@/i18n/server';
import { PagePlaceholder } from '@/components/page-placeholder';

export default async function NutritionPage() {
  const { t } = await getT();
  return <PagePlaceholder title={t.nav.nutrition} note="Registro de comidas y macros — Fase 4." />;
}
