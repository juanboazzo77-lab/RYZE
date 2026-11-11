'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { publishNotice } from '@/server/gym-notices';

export type NoticeActionResult = { ok: true; gyms: number; emails: number } | { error: 'INVALID' | 'TITLE' | 'BODY' | 'LINK' | 'NO_GYMS' };

const schema = z.object({
  title: z.string().max(300),
  body: z.string().max(10_000),
  link: z.string().max(500),
  gymIds: z.array(z.string().max(60)).max(500),
  email: z.boolean(),
});

/** Manda un aviso a todos los gimnasios (o a los elegidos). Solo el administrador. */
export async function sendGymNotice(raw: z.input<typeof schema>): Promise<NoticeActionResult> {
  const adminEmail = await requireAdmin();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const res = await publishNotice(adminEmail, parsed.data);
  revalidatePath('/avisos');
  return res;
}
