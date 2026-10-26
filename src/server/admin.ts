import 'server-only';
import { prisma } from './db';
import { PLAN_PRICE_USD, BASIC_PRICE_USD } from '@/features/billing/plans';
import { TRIAL_DAYS } from './entitlements';

/**
 * Panel interno: números del negocio. Sólo lo ven los mails de `ADMIN_EMAILS` (separados por
 * coma); si la variable no está definida, nadie lo ve. Lee con el cliente global a propósito:
 * son agregados de todo el servicio, no datos de un usuario.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

/** Comisión de la tienda que se descuenta del bruto (Apple/Google, programa de pequeños: 15%). */
export const STORE_FEE = 0.15;

const num = (v: unknown) => Number(v ?? 0);

export interface AdminStats {
  generatedAt: string;
  users: { total: number; onboarded: number; new7: number; new30: number };
  active: { d1: number; d7: number; d30: number };
  tiers: Array<{ tier: string; users: number }>;
  funnel: { inTrial: number; trialEnded: number; paidOfEnded: number; conversionPct: number | null };
  signupsByDay: Array<{ day: string; n: number }>;
  ai: {
    cost30: number;
    byTask: Array<{ task: string; costUsd: number; messages: number }>;
    byTier: Array<{ tier: string; costUsd: number; users: number; perUserUsd: number }>;
    topUsers: Array<{ email: string; tier: string; costUsd: number }>;
  };
  revenue: {
    grossMonthlyUsd: number;
    netMonthlyUsd: number;
    aiCostMonthlyUsd: number;
    marginUsd: number;
    note: string;
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  // Secuencial: el pool tiene pocas conexiones y son pocas consultas.
  const users = await prisma.$queryRaw<
    Array<{ total: bigint; onboarded: bigint; new7: bigint; new30: bigint }>
  >`SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) AS onboarded,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS new7,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS new30
    FROM profile`;

  const active = await prisma.$queryRaw<Array<{ d1: bigint; d7: bigint; d30: bigint }>>`
    WITH a AS (
      SELECT user_id, created_at AS ts FROM food_entry
      UNION ALL SELECT user_id, created_at FROM workout
      UNION ALL SELECT user_id, created_at FROM weight_entry
      UNION ALL SELECT user_id, day::timestamp FROM ai_usage_daily
    )
    SELECT
      COUNT(DISTINCT user_id) FILTER (WHERE ts >= now() - interval '1 day') AS d1,
      COUNT(DISTINCT user_id) FILTER (WHERE ts >= now() - interval '7 days') AS d7,
      COUNT(DISTINCT user_id) FILTER (WHERE ts >= now() - interval '30 days') AS d30
    FROM a`;

  const tiers = await prisma.$queryRaw<Array<{ tier: string; users: bigint }>>`
    SELECT tier::text AS tier, COUNT(*) AS users
    FROM entitlement
    WHERE status = 'ACTIVE'
    GROUP BY tier
    ORDER BY tier`;

  const funnel = await prisma.$queryRaw<
    Array<{ in_trial: bigint; ended: bigint; paid: bigint }>
  >`SELECT
      COUNT(*) FILTER (WHERE tier = 'FREE' AND created_at >= now() - (${TRIAL_DAYS}::int * interval '1 day')) AS in_trial,
      COUNT(*) FILTER (WHERE created_at < now() - (${TRIAL_DAYS}::int * interval '1 day')) AS ended,
      COUNT(*) FILTER (WHERE created_at < now() - (${TRIAL_DAYS}::int * interval '1 day') AND tier <> 'FREE') AS paid
    FROM entitlement`;

  const signups = await prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS n
    FROM profile
    WHERE created_at >= now() - interval '14 days'
    GROUP BY 1
    ORDER BY 1`;

  const byTask = await prisma.$queryRaw<Array<{ task: string; cost: unknown; msgs: bigint }>>`
    SELECT task, COALESCE(SUM(cost_usd), 0) AS cost, COALESCE(SUM(message_count), 0) AS msgs
    FROM ai_usage_daily
    WHERE day >= (now() - interval '30 days')::date
    GROUP BY task
    ORDER BY cost DESC`;

  const byTier = await prisma.$queryRaw<Array<{ tier: string; cost: unknown; users: bigint }>>`
    SELECT e.tier::text AS tier, COALESCE(SUM(u.cost_usd), 0) AS cost, COUNT(DISTINCT u.user_id) AS users
    FROM ai_usage_daily u
    JOIN entitlement e ON e.user_id = u.user_id
    WHERE u.day >= (now() - interval '30 days')::date
    GROUP BY e.tier
    ORDER BY cost DESC`;

  const top = await prisma.$queryRaw<Array<{ email: string; tier: string; cost: unknown }>>`
    SELECT p.email, e.tier::text AS tier, SUM(u.cost_usd) AS cost
    FROM ai_usage_daily u
    JOIN profile p ON p.id = u.user_id
    JOIN entitlement e ON e.user_id = u.user_id
    WHERE u.day >= (now() - interval '30 days')::date
    GROUP BY p.email, e.tier
    ORDER BY cost DESC
    LIMIT 5`;

  const u = users[0]!;
  const f = funnel[0]!;
  const ended = num(f.ended);
  const paid = num(f.paid);

  const tierRows = tiers.map((t) => ({ tier: t.tier, users: num(t.users) }));
  const count = (tier: string) => tierRows.find((t) => t.tier === tier)?.users ?? 0;
  const grossMonthlyUsd =
    count('BASIC') * BASIC_PRICE_USD +
    count('PRO') * PLAN_PRICE_USD.PRO.monthly +
    count('COACH') * PLAN_PRICE_USD.COACH.monthly;
  const aiCost30 = byTask.reduce((acc, r) => acc + num(r.cost), 0);
  const netMonthlyUsd = grossMonthlyUsd * (1 - STORE_FEE);

  return {
    generatedAt: new Date().toISOString(),
    users: { total: num(u.total), onboarded: num(u.onboarded), new7: num(u.new7), new30: num(u.new30) },
    active: { d1: num(active[0]?.d1), d7: num(active[0]?.d7), d30: num(active[0]?.d30) },
    tiers: tierRows,
    funnel: {
      inTrial: num(f.in_trial),
      trialEnded: ended,
      paidOfEnded: paid,
      conversionPct: ended > 0 ? Math.round((paid / ended) * 1000) / 10 : null,
    },
    signupsByDay: signups.map((s) => ({ day: s.day.toISOString().slice(0, 10), n: num(s.n) })),
    ai: {
      cost30: aiCost30,
      byTask: byTask.map((r) => ({ task: r.task, costUsd: num(r.cost), messages: num(r.msgs) })),
      byTier: byTier.map((r) => ({
        tier: r.tier,
        costUsd: num(r.cost),
        users: num(r.users),
        perUserUsd: num(r.users) > 0 ? num(r.cost) / num(r.users) : 0,
      })),
      topUsers: top.map((r) => ({ email: r.email, tier: r.tier, costUsd: num(r.cost) })),
    },
    revenue: {
      grossMonthlyUsd,
      netMonthlyUsd,
      aiCostMonthlyUsd: aiCost30,
      marginUsd: netMonthlyUsd - aiCost30,
      note: 'Estimación: suscriptores activos × precio mensual, menos 15% de la tienda y el costo de IA de los últimos 30 días. No incluye planes de 3/6/12 meses ni suscripciones de la web.',
    },
  };
}
