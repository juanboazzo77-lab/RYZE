import { getT } from '@/i18n/server';
import { PagePlaceholder } from '@/components/page-placeholder';

export default async function CoachPage() {
  const { t } = await getT();
  return <PagePlaceholder title={t.nav.coach} note="Entrenador personal con IA — Fase 8." />;
}
