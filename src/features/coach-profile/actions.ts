'use server';

import { DateTime } from 'luxon';
import { getSession, requireUser } from '@/server/context';
import { forUser } from '@/server/user-db';
import { prisma } from '@/server/db';
import { can, limitsFor, physiqueMonthlyCap, withFullAccess } from '@/server/entitlements';
import { aiConfigured } from '@/server/ai/config';
import { previousSummary } from '@/features/physique/summary';
import { saveCoachProfileSchema } from './schema';
import { analyzePhysiqueSchema, physiqueAnalysisSchema, type PhysiqueAnalysis } from './physique-schema';

export interface Result<T = void> {
  ok?: boolean;
  error?: string;
  data?: T;
}

const j = (v: unknown) => JSON.stringify(v ?? {});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function saveCoachProfile(raw: unknown): Promise<Result> {
  const parsed = saveCoachProfileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[saveCoachProfile] validación', JSON.stringify(parsed.error.issues));
    return { error: 'INVALID' };
  }
  const d = parsed.data;

  // Sólo necesitamos el id de sesión: evitamos los dos upserts de requireUser()
  // (con connection_limit=15 cada round-trip extra suma latencia y riesgo de
  // P2024 al guardar).
  const user = await getSession();
  if (!user) return { error: 'NO_SESSION' };

  // Defensa en profundidad: la pantalla ya bloquea el acceso, pero la Server
  // Action se puede llamar directo. Sólo un `findUnique` liviano (no el upsert
  // de requireUser) para no sumar latencia al guardado.
  const row = await prisma.entitlement.findUnique({
    where: { userId: user.id },
    select: { tier: true, createdAt: true },
  });
  const entitlement = row ? withFullAccess(user.email, row) : null;
  if (!entitlement || !can(entitlement, 'coach_profile')) return { error: 'FORBIDDEN' };

  const db = forUser(user.id);

  // Un único statement (INSERT ... ON CONFLICT). Sin revalidatePath: las páginas
  // que lo muestran son dinámicas y refrescan solas al navegar.
  const run = () => db.$executeRaw`
    INSERT INTO "coach_profile"
      ("id", "user_id", "health", "food", "training", "goal", "lifestyle", "updated_at")
    VALUES (
      gen_random_uuid(), ${user.id}::uuid,
      ${j(d.health)}::jsonb, ${j(d.food)}::jsonb, ${j(d.training)}::jsonb,
      ${j(d.goal)}::jsonb, ${j(d.lifestyle)}::jsonb, now()
    )
    ON CONFLICT ("user_id") DO UPDATE SET
      "health" = EXCLUDED."health",
      "food" = EXCLUDED."food",
      "training" = EXCLUDED."training",
      "goal" = EXCLUDED."goal",
      "lifestyle" = EXCLUDED."lifestyle",
      "updated_at" = now()
  `;

  // Reintento corto: si la única conexión del pooler estaba ocupada (P2024),
  // suele liberarse en seguida.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await run();
      return { ok: true };
    } catch (err) {
      const transient =
        err instanceof Error && /P2024|P2028|pool|timed out|timeout|ECONNRESET/i.test(err.message);
      if (attempt === 3 || !transient) {
        console.error('[saveCoachProfile] escritura', err);
        return { error: 'SAVE_FAILED' };
      }
      await sleep(300 * attempt);
    }
  }
  return { error: 'SAVE_FAILED' };
}

/**
 * Análisis de físico por foto desde el perfil del coach (al completarlo). Sólo COACH y
 * con cupo mensual. Las fotos viven sólo en esta variable local: se mandan al modelo y
 * se descartan. Se guarda el informe de texto, que después aparece en la revisión semanal.
 */
export async function analyzePhysiqueAction(raw: {
  photos: string[];
}): Promise<Result<PhysiqueAnalysis>> {
  const parsed = analyzePhysiqueSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };

  const { userId, profile, entitlement } = await requireUser();
  if (!can(entitlement, 'coach_profile')) return { error: 'FORBIDDEN' };
  if (!aiConfigured()) return { error: 'NOT_CONFIGURED' };

  const db = forUser(userId);
  const monthStart = DateTime.now().setZone(profile.timezone).startOf('month').toJSDate();
  const [monthCount, last] = await Promise.all([
    db.physiqueAnalysis.count({ where: { createdAt: { gte: monthStart } } }),
    db.physiqueAnalysis.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);
  if (monthCount >= physiqueMonthlyCap(limitsFor(entitlement))) return { error: 'LIMIT_MONTH' };

  try {
    const { analyzePhysique } = await import('@/server/ai/gateway');
    const analysis = await analyzePhysique({
      profile,
      entitlement,
      photos: parsed.data.photos,
      previous: last
        ? previousSummary(physiqueAnalysisSchema.parse(last.report ?? {}), last.createdAt)
        : null,
    });
    if ('failure' in analysis) {
      return {
        error:
          analysis.failure === 'blocked'
            ? 'BLOCKED'
            : analysis.failure === 'busy'
              ? 'BUSY'
              : analysis.failure === 'timeout'
                ? 'TIMEOUT'
                : 'INVALID_OUTPUT',
      };
    }
    await db.physiqueAnalysis.create({
      data: { userId, report: analysis as object, photoCount: parsed.data.photos.length },
    });
    return { ok: true, data: analysis };
  } catch (e) {
    console.error('[physique] falló', e instanceof Error ? e.message : e);
    return { error: 'PROVIDER_ERROR' };
  }
}
