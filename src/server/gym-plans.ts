import 'server-only';
import { prisma } from './db';
import { asClassesMode, weekBounds, type PlanRule } from '@/features/gym/plans';
import { todayAR } from '@/features/gym/classes';

/**
 * El plan de pago que el gimnasio le asignó a un socio. El gimnasio carga a sus clientes en su panel y les asigna un plan;
 * acá se lo encuentra por el mail del socio. Sin plan asignado (o si el gimnasio no tiene planes) no hay restricciones.
 */

export interface MemberPlan extends PlanRule {
  id: string;
  name: string;
  description: string;
}

const dateOf = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/** El plan activo del socio en su gimnasio, o null si no tiene uno asignado. */
export async function getMemberPlan(userId: string, gymId: string): Promise<MemberPlan | null> {
  // Si falla (por ejemplo mientras se aplica una migración), se sigue como si no tuviera plan en vez de romper las clases.
  try {
    return await findMemberPlan(userId, gymId);
  } catch (e) {
    console.error('[gym-plans] no se pudo leer el plan del socio:', e instanceof Error ? e.message : e);
    return null;
  }
}

async function findMemberPlan(userId: string, gymId: string): Promise<MemberPlan | null> {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { email: true } });
  const email = profile?.email?.trim().toLowerCase();
  if (!email) return null;
  const client = await prisma.gymClient.findFirst({
    where: { gymId, active: true, email: { equals: email, mode: 'insensitive' }, plan: { is: { active: true, gymId } } },
    select: { plan: true },
  });
  const p = client?.plan;
  if (!p) return null;
  return { id: p.id, name: p.name, description: p.description ?? '', classesMode: asClassesMode(p.classesMode), classNames: p.classNames, weeklyLimit: p.weeklyLimit };
}

/** Cuántas reservas activas tiene el socio en la semana (lunes a domingo) de esa fecha. */
export async function bookingsInWeek(userId: string, gymId: string, dateISO: string): Promise<number> {
  const { start, end } = weekBounds(dateISO);
  return prisma.gymBooking.count({ where: { userId, status: 'BOOKED', date: { gte: dateOf(start), lte: dateOf(end) }, class: { gymId } } });
}

export interface MemberPlanStatus {
  plan: MemberPlan | null;
  /** Pagó su plan de Forza AI por la página del gimnasio y el gimnasio todavía no le asignó un plan: no puede reservar clases. */
  awaitingPlan: boolean;
  /** Reservas que ya tiene esta semana. */
  usedThisWeek: number;
}

/** Para mostrarle al socio en la pantalla de clases: su plan y cuántas reservas lleva esta semana. */
export async function getMemberPlanStatus(userId: string, gymId: string, now = new Date()): Promise<MemberPlanStatus> {
  const { plan, awaitingPlan } = await getMemberAccess(userId, gymId);
  if (!plan) return { plan: null, awaitingPlan, usedThisWeek: 0 };
  return { plan, awaitingPlan: false, usedThisWeek: await bookingsInWeek(userId, gymId, todayAR(now)) };
}

/**
 * Qué puede hacer el socio con las clases: su plan (si el gimnasio le asignó uno) o, si llegó por la página web del
 * gimnasio y todavía no tiene plan, queda esperando que el gimnasio lo confirme. Los socios que no llegaron por la web y
 * no tienen plan asignado no tienen restricciones.
 */
export async function getMemberAccess(userId: string, gymId: string): Promise<{ plan: MemberPlan | null; awaitingPlan: boolean }> {
  const plan = await getMemberPlan(userId, gymId);
  if (plan) return { plan, awaitingPlan: false };
  try {
    const m = await prisma.gymMember.findFirst({ where: { userId, gymId, status: 'ACTIVE', source: 'WEB' }, select: { id: true } });
    return { plan: null, awaitingPlan: Boolean(m) };
  } catch (e) {
    console.error('[gym-plans] no se pudo leer el origen del socio:', e instanceof Error ? e.message : e);
    return { plan: null, awaitingPlan: false };
  }
}
