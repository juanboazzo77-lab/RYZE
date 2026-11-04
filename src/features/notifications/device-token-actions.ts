'use server';

import { z } from 'zod';
import { requireUser } from '@/server/context';
import { prisma } from '@/server/db';

/** Token de APNs: 32 bytes en hexadecimal (64 caracteres); se deja algo de margen. */
const tokenSchema = z.object({ token: z.string().regex(/^[0-9a-fA-F]{32,200}$/) });

/** Guarda el token del teléfono para mandarle avisos. Si ya era de otra cuenta, pasa a esta. */
export async function saveDeviceToken(raw: { token: string }): Promise<{ ok?: boolean; error?: string }> {
  const parsed = tokenSchema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { userId } = await requireUser();
  const token = parsed.data.token.toLowerCase();
  await prisma.deviceToken.upsert({
    where: { token },
    create: { userId, token, platform: 'ios' },
    update: { userId },
  });
  return { ok: true };
}
