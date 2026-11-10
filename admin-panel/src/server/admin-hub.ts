import 'server-only';
import { prisma } from './db';
import { ensureCurrentPayments, listPayments, totalsOf, type BillingTotals } from './gym-billing';

/**
 * Datos del centro de gestión (/admin): lo que hay que mirar y hacer cada día. Cliente global a propósito:
 * son números de todo el servicio y sólo lo ven los mails de ADMIN_EMAILS.
 */

const DAY = 24 * 60 * 60 * 1000;

export interface SubscriberRow {
  userId: string;
  email: string;
  name: string | null;
  tier: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  /** Cuándo se tocó por última vez su plan (alta o cambio). */
  since: string;
  periodEnd: string | null;
  isNew: boolean;
}

export interface SubscribersView {
  rows: SubscriberRow[];
  new7: number;
  new30: number;
  pastDue: number;
  canceled: number;
  byTier: Array<{ tier: string; n: number }>;
}

export async function getSubscribers(): Promise<SubscribersView> {
  const list = await prisma.entitlement.findMany({
    where: { tier: { not: 'FREE' } },
    orderBy: { updatedAt: 'desc' },
    take: 300,
    select: {
      userId: true,
      tier: true,
      status: true,
      currentPeriodEnd: true,
      updatedAt: true,
      user: { select: { email: true, name: true } },
    },
  });
  const now = Date.now();
  const rows: SubscriberRow[] = list.map((e) => ({
    userId: e.userId,
    email: e.user.email,
    name: e.user.name,
    tier: e.tier,
    status: e.status === 'PAST_DUE' ? 'PAST_DUE' : e.status === 'CANCELED' ? 'CANCELED' : 'ACTIVE',
    since: e.updatedAt.toISOString(),
    periodEnd: e.currentPeriodEnd ? e.currentPeriodEnd.toISOString() : null,
    isNew: now - e.updatedAt.getTime() < 7 * DAY,
  }));
  const tiers = new Map<string, number>();
  for (const r of rows) if (r.status !== 'CANCELED') tiers.set(r.tier, (tiers.get(r.tier) ?? 0) + 1);
  return {
    rows,
    new7: rows.filter((r) => now - new Date(r.since).getTime() < 7 * DAY && r.status === 'ACTIVE').length,
    new30: rows.filter((r) => now - new Date(r.since).getTime() < 30 * DAY && r.status === 'ACTIVE').length,
    pastDue: rows.filter((r) => r.status === 'PAST_DUE').length,
    canceled: rows.filter((r) => r.status === 'CANCELED').length,
    byTier: [...tiers.entries()].map(([tier, n]) => ({ tier, n })),
  };
}

export interface TodaySummary {
  generatedAt: string;
  users: { new24h: number; new7d: number; total: number };
  subscribers: { new7d: number; pastDue: number; total: number };
  errors: { open: number; last24h: number; recent: Array<{ id: string; message: string; path: string | null; count: number; lastSeen: string }> };
  gyms: {
    pending: Array<{ id: string; name: string; city: string | null; createdAt: string }>;
    active: number;
    full: number;
    members: number;
  };
  billing: BillingTotals;
  /** Altas de socios que los gimnasios pidieron y esperan tu aprobación. */
  invitesPending: number;
  overdue: Array<{ id: string; gymName: string; period: string; amount: number; currency: 'ARS' | 'USD'; dueDate: string }>;
}

export async function getTodaySummary(): Promise<TodaySummary> {
  const now = Date.now();
  // Se arman los cobros del mes antes de contar (así "adeudado" está al día).
  await ensureCurrentPayments().catch((e) => console.error('[admin-hub] cobros', e instanceof Error ? e.message : e));

  // Secuencial: el pool de conexiones es chico.
  const usersTotal = await prisma.profile.count();
  const users24 = await prisma.profile.count({ where: { createdAt: { gte: new Date(now - DAY) } } });
  const users7 = await prisma.profile.count({ where: { createdAt: { gte: new Date(now - 7 * DAY) } } });

  const subs = await getSubscribers();

  const openErrors = await prisma.appError.count({ where: { status: 'OPEN' } });
  const errors24 = await prisma.appError.count({ where: { status: 'OPEN', lastSeen: { gte: new Date(now - DAY) } } });
  const recent = await prisma.appError.findMany({
    where: { status: 'OPEN' },
    orderBy: { lastSeen: 'desc' },
    take: 5,
    select: { id: true, message: true, path: true, count: true, lastSeen: true },
  });

  const pendingGyms = await prisma.gym.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, city: true, createdAt: true },
  });
  const activeGyms = await prisma.gym.findMany({ where: { status: 'ACTIVE' }, select: { id: true, memberLimit: true } });
  const counts = await prisma.gymMember.groupBy({
    by: ['gymId'],
    where: { status: 'ACTIVE', source: { not: 'WEB' }, gymId: { in: activeGyms.map((g) => g.id) } },
    _count: { _all: true },
  });
  const byGym = new Map(counts.map((c) => [c.gymId, c._count._all]));
  const full = activeGyms.filter((g) => g.memberLimit > 0 && (byGym.get(g.id) ?? 0) >= g.memberLimit).length;
  const gymMembers = [...byGym.values()].reduce((a, b) => a + b, 0);

  const invitesPending = await prisma.gymInvite.count({ where: { status: 'PENDING', gym: { status: 'ACTIVE' } } });

  const payments = await listPayments();
  const billing = totalsOf(payments);

  return {
    generatedAt: new Date(now).toISOString(),
    users: { new24h: users24, new7d: users7, total: usersTotal },
    subscribers: { new7d: subs.new7, pastDue: subs.pastDue, total: subs.rows.filter((r) => r.status !== 'CANCELED').length },
    errors: {
      open: openErrors,
      last24h: errors24,
      recent: recent.map((r) => ({ id: r.id, message: r.message, path: r.path, count: r.count, lastSeen: r.lastSeen.toISOString() })),
    },
    gyms: {
      pending: pendingGyms.map((g) => ({ id: g.id, name: g.name, city: g.city, createdAt: g.createdAt.toISOString() })),
      active: activeGyms.length,
      full,
      members: gymMembers,
    },
    billing,
    invitesPending,
    overdue: payments
      .filter((p) => p.overdue)
      .map((p) => ({ id: p.id, gymName: p.gymName, period: p.period, amount: p.amount, currency: p.currency, dueDate: p.dueDate })),
  };
}
