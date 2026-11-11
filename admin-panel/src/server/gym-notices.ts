import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendMail } from './alerts';
import { composeEmail } from './email-template';
import { cleanNotice } from '@/features/gym/notices';

/**
 * Avisos del administrador a los gimnasios: se escriben en Gestión, se ven en el panel de cada gimnasio y, si se elige,
 * también le llegan por mail al dueño. Las funciones de administrador comprueban el permiso en la acción que las llama.
 */

const PANEL_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://panel.forzaai.app').replace(/\/$/, '');

export interface NoticeRow {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  emailed: boolean;
  /** A cuántos gimnasios les tocó y cuántos lo leyeron. */
  recipients: number;
  readBy: number;
  toAll: boolean;
}

/** Los gimnasios con dueño (a los que se les puede avisar), para elegir a quiénes. */
export async function listGymsToNotify(): Promise<Array<{ id: string; name: string; city: string | null }>> {
  return prisma.gym.findMany({
    where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] }, ownerUserId: { not: null } },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  });
}

/** El historial de avisos con cuántos gimnasios lo leyeron (para el administrador). */
export async function listNoticesForAdmin(limit = 50): Promise<NoticeRow[]> {
  const [notices, gyms] = await Promise.all([
    prisma.gymNotice.findMany({ orderBy: { createdAt: 'desc' }, take: limit, include: { _count: { select: { reads: true } } } }),
    listGymsToNotify(),
  ]);
  const all = new Set(gyms.map((g) => g.id));
  return notices.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
    emailed: n.emailed,
    toAll: n.gymIds.length === 0,
    recipients: n.gymIds.length === 0 ? all.size : n.gymIds.filter((id) => all.has(id)).length,
    readBy: n._count.reads,
  }));
}

export type PublishResult = { ok: true; gyms: number; emails: number } | { error: 'TITLE' | 'BODY' | 'LINK' | 'NO_GYMS' };

/** Publica un aviso. Si se pidió, manda también un mail a cada dueño (en segundo plano, de a uno). */
export async function publishNotice(adminEmail: string, raw: Parameters<typeof cleanNotice>[0]): Promise<PublishResult> {
  const input = cleanNotice(raw);
  if ('error' in input) return input;
  const gyms = await prisma.gym.findMany({
    where: { status: { in: ['ACTIVE', 'SUSPENDED', 'PENDING'] }, ownerUserId: { not: null }, ...(input.gymIds.length > 0 ? { id: { in: input.gymIds } } : {}) },
    select: { id: true, name: true, owner: { select: { email: true } } },
  });
  if (gyms.length === 0) return { error: 'NO_GYMS' };
  await prisma.gymNotice.create({
    data: { title: input.title, body: input.body, link: input.link, gymIds: input.gymIds, emailed: input.email, sentBy: adminEmail },
  });

  const emails = input.email ? [...new Set(gyms.map((g) => g.owner?.email?.trim().toLowerCase()).filter((e): e is string => !!e))] : [];
  if (emails.length > 0) {
    const mail = composeEmail({
      subject: input.title,
      preheader: input.body.slice(0, 120),
      heading: input.title,
      blocks: [
        ...input.body.split(/\n{2,}/).map((t) => ({ type: 'p' as const, text: t.trim() })).filter((b) => b.text),
        ...(input.link ? [{ type: 'button' as const, label: 'Ver más', url: input.link }] : []),
        { type: 'button' as const, label: 'Abrir mi panel', url: `${PANEL_URL}/gym/avisos` },
        { type: 'note' as const, text: 'Recibís este aviso porque sos dueño de un gimnasio en Forza AI. Lo ves también dentro de tu panel, en Avisos.' },
      ],
    });
    // De a uno y con una pausa corta: el servicio de mails limita cuántos se mandan por segundo.
    after(async () => {
      for (const to of emails) {
        await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html });
        await new Promise((r) => setTimeout(r, 600));
      }
    });
  }
  return { ok: true, gyms: gyms.length, emails: emails.length };
}

/* ---------- Del lado del gimnasio ---------- */

export interface GymNoticeView {
  id: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  read: boolean;
}

const forGym = (gymId: string) => ({ OR: [{ gymIds: { isEmpty: true } }, { gymIds: { has: gymId } }] });

/** Los avisos que le tocan a este gimnasio, del más nuevo al más viejo, con si ya los leyó. */
export async function listNoticesForGym(gymId: string, limit = 30): Promise<GymNoticeView[]> {
  const rows = await prisma.gymNotice.findMany({
    where: forGym(gymId),
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { reads: { where: { gymId }, select: { gymId: true } } },
  });
  return rows.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString(), read: n.reads.length > 0 }));
}

/** Cuántos avisos todavía no leyó este gimnasio. Si falla (por ejemplo mientras se aplica una migración), 0. */
export async function countUnreadNotices(gymId: string): Promise<number> {
  try {
    return await prisma.gymNotice.count({ where: { ...forGym(gymId), reads: { none: { gymId } } } });
  } catch (e) {
    console.error('[avisos] no se pudieron contar los avisos:', e instanceof Error ? e.message : e);
    return 0;
  }
}

/** Marca como leídos todos los avisos pendientes de este gimnasio. */
export async function markNoticesRead(gymId: string): Promise<void> {
  const pending = await prisma.gymNotice.findMany({ where: { ...forGym(gymId), reads: { none: { gymId } } }, select: { id: true }, take: 200 });
  if (pending.length === 0) return;
  await prisma.gymNoticeRead.createMany({ data: pending.map((n) => ({ noticeId: n.id, gymId })), skipDuplicates: true });
}
