import 'server-only';
import type { Entitlement } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '@/server/db';
import { limitsFor } from '@/server/entitlements';
import { estimateCostUsd } from './pricing';
import { AiRateLimitedError } from './errors';
import type { AiUsageRaw } from './providers/types';
import type { AiTask } from './config';

/**
 * Metering y rate-limit del uso de IA. Se chequea ANTES de llamar al modelo y
 * se registra DESPUÉS. Fuente de verdad de "cuánto va usado": `ai_usage_daily`.
 */

const COACH_TASKS: AiTask[] = ['coach_chat'];
const PLAN_TASKS: AiTask[] = ['generate_plan'];

/** Lanza `AiRateLimitedError` si el usuario ya gastó su cuota. */
export async function assertWithinLimits(
  userId: string,
  entitlement: Pick<Entitlement, 'tier'>,
  task: AiTask,
  timezone: string,
): Promise<void> {
  const limits = limitsFor(entitlement);
  const now = DateTime.now().setZone(timezone);

  if (COACH_TASKS.includes(task)) {
    const today = now.toISODate()!;
    const rows = await prisma.aiUsageDaily.findMany({
      where: { userId, day: new Date(`${today}T00:00:00.000Z`), task: { in: COACH_TASKS } },
      select: { messageCount: true },
    });
    const used = rows.reduce((n, r) => n + r.messageCount, 0);
    if (used >= limits.aiCoachMessagesPerDay) {
      throw new AiRateLimitedError(`coach ${used}/${limits.aiCoachMessagesPerDay}`);
    }
    return;
  }

  if (PLAN_TASKS.includes(task)) {
    const monthStart = now.startOf('month').toISODate()!;
    const rows = await prisma.aiUsageDaily.findMany({
      where: {
        userId,
        day: { gte: new Date(`${monthStart}T00:00:00.000Z`) },
        task: { in: ['generate_plan'] },
      },
      select: { messageCount: true },
    });
    const used = rows.reduce((n, r) => n + r.messageCount, 0);
    if (used >= limits.aiPlansPerMonth) {
      throw new AiRateLimitedError(`planes ${used}/${limits.aiPlansPerMonth}`);
    }
  }
}

/** Registra el uso de una llamada. `countsAsMessage` incrementa la cuota. */
export async function recordUsage(
  userId: string,
  task: AiTask,
  model: string,
  usage: AiUsageRaw,
  timezone: string,
  countsAsMessage = true,
): Promise<void> {
  const today = DateTime.now().setZone(timezone).toISODate()!;
  const day = new Date(`${today}T00:00:00.000Z`);
  const costUsd = estimateCostUsd(model, usage);
  try {
    await prisma.aiUsageDaily.upsert({
      where: { userId_day_task_model: { userId, day, task, model } },
      create: {
        userId,
        day,
        task,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd,
        messageCount: countsAsMessage ? 1 : 0,
      },
      update: {
        inputTokens: { increment: usage.inputTokens },
        outputTokens: { increment: usage.outputTokens },
        costUsd: { increment: costUsd },
        messageCount: { increment: countsAsMessage ? 1 : 0 },
      },
    });
  } catch {
    // el metering nunca bloquea la operación de negocio
  }
}

/** Cuánto le queda al usuario hoy/este mes (para mostrar en la UI). */
export async function usageSnapshot(
  userId: string,
  entitlement: Pick<Entitlement, 'tier'>,
  timezone: string,
): Promise<{ coachUsed: number; coachLimit: number; plansUsed: number; plansLimit: number }> {
  const limits = limitsFor(entitlement);
  const now = DateTime.now().setZone(timezone);
  const today = new Date(`${now.toISODate()}T00:00:00.000Z`);
  const monthStart = new Date(`${now.startOf('month').toISODate()}T00:00:00.000Z`);

  const [coachRows, planRows] = await prisma.$transaction([
    prisma.aiUsageDaily.findMany({
      where: { userId, day: today, task: { in: COACH_TASKS } },
      select: { messageCount: true },
    }),
    prisma.aiUsageDaily.findMany({
      where: { userId, day: { gte: monthStart }, task: 'generate_plan' },
      select: { messageCount: true },
    }),
  ]);

  return {
    coachUsed: coachRows.reduce((n, r) => n + r.messageCount, 0),
    coachLimit: limits.aiCoachMessagesPerDay,
    plansUsed: planRows.reduce((n, r) => n + r.messageCount, 0),
    plansLimit: limits.aiPlansPerMonth,
  };
}
