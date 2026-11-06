'use server';

import { z } from 'zod';
import { submitGymApplication } from '@/server/applications';

interface Result {
  ok?: boolean;
  error?: 'INVALID' | 'TOO_MANY' | 'ERROR';
}

const schema = z.object({
  name: z.string().max(200),
  city: z.string().max(200).optional(),
  contactName: z.string().max(200),
  contactEmail: z.string().max(300),
  contactPhone: z.string().max(100).optional(),
  memberEstimate: z.number().finite().optional(),
  message: z.string().max(2000).optional(),
  /** Trampa para robots: una persona no lo ve ni lo completa. */
  website: z.string().max(200).optional(),
});

/** Formulario público: un gimnasio pide ser parte. No hay sesión; se guarda como pendiente. */
export async function applyAsGym(raw: z.input<typeof schema>): Promise<Result> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: 'INVALID' };
  const { website, ...data } = parsed.data;
  // Si el campo escondido viene lleno es un robot: se responde "ok" sin guardar nada.
  if (website && website.trim().length > 0) return { ok: true };
  try {
    const res = await submitGymApplication(data);
    return 'ok' in res ? { ok: true } : { error: res.error };
  } catch (e) {
    console.error('[gym] no se pudo guardar la solicitud', e instanceof Error ? e.message : e);
    return { error: 'ERROR' };
  }
}
