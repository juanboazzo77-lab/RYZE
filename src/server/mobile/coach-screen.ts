import 'server-only';
import { requireUser } from '@/server/context';
import { aiConfigured } from '@/server/ai/config';
import { usageSnapshot } from '@/server/ai/usage';
import { getCoachHistory, getCoachThreads } from '@/features/coach/queries';

/** Lo que necesita la pantalla del coach al abrirse: lo mismo que arma la página de la web. */
export async function coachScreen() {
  const ctx = await requireUser();
  if (!aiConfigured()) return { configured: false as const };
  const [threads, history, usage] = await Promise.all([
    getCoachThreads(ctx.userId),
    getCoachHistory(ctx.userId).catch(() => []),
    usageSnapshot(ctx.userId, ctx.entitlement, ctx.profile.timezone),
  ]);
  return {
    configured: true as const,
    threads,
    history,
    usage: { used: usage.coachUsed, limit: usage.coachLimit },
    autoApply: ctx.profile.coachAutoApply,
  };
}
