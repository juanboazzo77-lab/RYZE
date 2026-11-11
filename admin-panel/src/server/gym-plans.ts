import 'server-only';
import { prisma } from './db';
import { asClassesMode, cleanPlan, MAX_PLANS_PER_GYM, type ClassesMode } from '@/features/gym/plans';

/**
 * Planes de pago del gimnasio: el dueño define qué planes tiene (nombre, precio de referencia, qué clases incluye y cuántas
 * reservas por semana) y le asigna uno a cada cliente. Todo se hace sobre el gimnasio del que la cuenta es dueña (se vuelve
 * a comprobar en cada función). Cliente global a propósito: son datos del gimnasio, no de un usuario de la app.
 */

export interface PlanRow {
  id: string;
  name: string;
  description: string;
  price: number | null;
  classesMode: ClassesMode;
  classNames: string[];
  weeklyLimit: number | null;
  clients: number;
}

async function ownedGym(ownerUserId: string, gymId: string) {
  return prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] } }, select: { id: true } });
}

/** Los planes del gimnasio, con cuántos clientes tiene cada uno. */
export async function listPlans(ownerUserId: string, gymId: string): Promise<PlanRow[] | null> {
  if (!(await ownedGym(ownerUserId, gymId))) return null;
  const rows = await prisma.gymPlan.findMany({
    where: { gymId, active: true },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { clients: { where: { active: true } } } } },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    price: p.price === null ? null : Number(p.price),
    classesMode: asClassesMode(p.classesMode),
    classNames: p.classNames,
    weeklyLimit: p.weeklyLimit,
    clients: p._count.clients,
  }));
}

/** Los tipos de clase (nombres) que el gimnasio tiene cargados, para elegir cuáles incluye cada plan. */
export async function listClassTypes(ownerUserId: string, gymId: string): Promise<string[]> {
  if (!(await ownedGym(ownerUserId, gymId))) return [];
  const rows = await prisma.gymClass.findMany({ where: { gymId, active: true }, select: { name: true }, distinct: ['name'], orderBy: { name: 'asc' }, take: 100 });
  return rows.map((r) => r.name);
}

export type SavePlanResult = { ok: true; id: string } | { error: 'NOT_OWNER' | 'NOT_FOUND' | 'NAME' | 'PRICE' | 'CLASSES' | 'LIMIT' | 'TOO_MANY' | 'DUPLICATE' };

/** Crea un plan (sin `id`) o cambia uno existente. */
export async function savePlan(ownerUserId: string, gymId: string, id: string | null, raw: Parameters<typeof cleanPlan>[0]): Promise<SavePlanResult> {
  if (!(await ownedGym(ownerUserId, gymId))) return { error: 'NOT_OWNER' };
  const input = cleanPlan(raw);
  if ('error' in input) return input;
  const clash = await prisma.gymPlan.findFirst({ where: { gymId, active: true, name: { equals: input.name, mode: 'insensitive' }, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { error: 'DUPLICATE' };
  const data = { name: input.name, description: input.description || null, price: input.price, classesMode: input.classesMode, classNames: input.classNames, weeklyLimit: input.weeklyLimit };
  if (id) {
    const res = await prisma.gymPlan.updateMany({ where: { id, gymId, active: true }, data });
    return res.count > 0 ? { ok: true, id } : { error: 'NOT_FOUND' };
  }
  if ((await prisma.gymPlan.count({ where: { gymId, active: true } })) >= MAX_PLANS_PER_GYM) return { error: 'TOO_MANY' };
  const created = await prisma.gymPlan.create({ data: { gymId, ...data }, select: { id: true } });
  return { ok: true, id: created.id };
}

/** Borra un plan: sus clientes quedan sin plan asignado (sin restricciones). */
export async function removePlan(ownerUserId: string, gymId: string, id: string): Promise<boolean> {
  if (!(await ownedGym(ownerUserId, gymId))) return false;
  return prisma.$transaction(async (tx) => {
    const res = await tx.gymPlan.updateMany({ where: { id, gymId, active: true }, data: { active: false } });
    if (res.count === 0) return false;
    await tx.gymClient.updateMany({ where: { gymId, planId: id }, data: { planId: null } });
    return true;
  });
}

/**
 * Le asigna un plan a un cliente (o se lo saca con `null`). Si el cliente todavía no tiene cuota cargada y el plan tiene
 * precio, la cuota queda con ese precio.
 */
export async function setClientPlan(ownerUserId: string, clientId: string, planId: string | null): Promise<'ok' | 'NOT_FOUND'> {
  const client = await prisma.gymClient.findFirst({ where: { id: clientId, active: true, gym: { ownerUserId } }, select: { id: true, gymId: true, feeAmount: true } });
  if (!client) return 'NOT_FOUND';
  let price: number | null = null;
  if (planId) {
    const plan = await prisma.gymPlan.findFirst({ where: { id: planId, gymId: client.gymId, active: true }, select: { price: true } });
    if (!plan) return 'NOT_FOUND';
    price = plan.price === null ? null : Number(plan.price);
  }
  await prisma.gymClient.update({
    where: { id: client.id },
    data: { planId, ...(planId && price !== null && client.feeAmount === null ? { feeAmount: price } : {}) },
  });
  return 'ok';
}
