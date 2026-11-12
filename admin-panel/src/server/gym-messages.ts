import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendMail } from './alerts';
import { composeEmail } from './email-template';
import { cleanMessage } from '@/features/gym/messages';

/**
 * Mensajes del dueño del gimnasio a sus clientes: quedan en la app de los socios del gimnasio y, si el dueño lo pide,
 * también le llegan por mail a los clientes de su lista que tienen mail. Se comprueba que la cuenta sea la dueña.
 */

export interface MessageRow {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  emailed: boolean;
}

async function ownedGym(ownerUserId: string, gymId: string) {
  return prisma.gym.findFirst({ where: { id: gymId, ownerUserId, status: 'ACTIVE' }, select: { id: true, name: true } });
}

export async function listMessages(ownerUserId: string, gymId: string, limit = 30): Promise<MessageRow[] | null> {
  if (!(await ownedGym(ownerUserId, gymId))) return null;
  const rows = await prisma.gymMessage.findMany({ where: { gymId }, orderBy: { createdAt: 'desc' }, take: limit });
  return rows.map((m) => ({ id: m.id, title: m.title, body: m.body, createdAt: m.createdAt.toISOString(), emailed: m.emailed }));
}

export type SendMessageResult = { ok: true; emails: number } | { error: 'NOT_OWNER' | 'TITLE' | 'BODY' };

/** Publica el mensaje y, si se pidió, lo manda por mail (de a uno, en segundo plano) a los clientes con mail. */
export async function sendMessage(ownerUserId: string, gymId: string, raw: Parameters<typeof cleanMessage>[0]): Promise<SendMessageResult> {
  const gym = await ownedGym(ownerUserId, gymId);
  if (!gym) return { error: 'NOT_OWNER' };
  const input = cleanMessage(raw);
  if ('error' in input) return input;
  await prisma.gymMessage.create({ data: { gymId, title: input.title, body: input.body, emailed: input.email } });

  let emails: string[] = [];
  if (input.email) {
    const clients = await prisma.gymClient.findMany({ where: { gymId, active: true, email: { not: null } }, select: { email: true } });
    emails = [...new Set(clients.map((c) => c.email!.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)))].slice(0, 500);
  }
  if (emails.length > 0) {
    const mail = composeEmail({
      subject: `${gym.name}: ${input.title}`,
      preheader: input.body.slice(0, 120),
      heading: input.title,
      blocks: [
        ...input.body.split(/\n{2,}/).map((t) => ({ type: 'p' as const, text: t.trim() })).filter((b) => b.text),
        { type: 'note' as const, text: `Recibís este mensaje de ${gym.name}, que tiene tu mail en su lista de clientes.` },
      ],
    });
    after(async () => {
      for (const to of emails) {
        await sendMail({ to, subject: mail.subject, text: mail.text, html: mail.html });
        await new Promise((r) => setTimeout(r, 600));
      }
    });
  }
  return { ok: true, emails: emails.length };
}
