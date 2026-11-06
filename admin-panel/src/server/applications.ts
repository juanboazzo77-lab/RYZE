import 'server-only';
import { after } from 'next/server';
import { prisma } from './db';
import { sendAlert } from './alerts';
import { MAX_MEMBER_ESTIMATE } from '@/features/gym/logic';
import { TERMS_VERSION } from '@/features/legal/gym-terms';

/** Alta de un gimnasio nuevo (formulario público): queda pendiente hasta que el administrador lo aprueba. */

export interface GymApplicationInput {
  name: string;
  city?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  memberEstimate?: number;
  message?: string;
  /** Aceptó los términos para gimnasios (obligatorio). */
  acceptedTerms?: boolean;
}

const clip = (v: string | undefined, max: number) => (v ?? '').trim().slice(0, max);

/** Guarda la solicitud. Si ya hay una pendiente con ese mail no se duplica (devuelve ok igual). */
export async function submitGymApplication(input: GymApplicationInput): Promise<{ ok: true } | { error: 'INVALID' | 'TOO_MANY' | 'TERMS' }> {
  if (input.acceptedTerms !== true) return { error: 'TERMS' };
  const name = clip(input.name, 120);
  const contactName = clip(input.contactName, 120);
  const contactEmail = clip(input.contactEmail, 200).toLowerCase();
  if (name.length < 2 || contactName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { error: 'INVALID' };
  }
  const estimate =
    typeof input.memberEstimate === 'number' && Number.isFinite(input.memberEstimate)
      ? Math.min(MAX_MEMBER_ESTIMATE, Math.max(0, Math.round(input.memberEstimate)))
      : null;

  const pending = await prisma.gym.count({ where: { contactEmail, status: 'PENDING' } });
  if (pending > 0) return { ok: true };
  // Freno simple contra el abuso del formulario público.
  const lastDay = await prisma.gym.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  if (lastDay >= 50) return { error: 'TOO_MANY' };

  await prisma.gym.create({
    data: {
      name,
      city: clip(input.city, 80) || null,
      contactName,
      contactEmail,
      contactPhone: clip(input.contactPhone, 40) || null,
      memberEstimate: estimate,
      message: clip(input.message, 600) || null,
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  });
  // Aviso por mail al equipo (no frena ni rompe el alta si falla).
  const text = [
    `Un gimnasio pidió sumarse a Forza AI.`,
    '',
    `Gimnasio: ${name}${clip(input.city, 80) ? ` (${clip(input.city, 80)})` : ''}`,
    `Contacto: ${contactName} · ${contactEmail}${clip(input.contactPhone, 40) ? ` · ${clip(input.contactPhone, 40)}` : ''}`,
    estimate ? `Dice tener unos ${estimate} socios.` : '',
    clip(input.message, 600) ? `Mensaje: ${clip(input.message, 600)}` : '',
    '',
    'Aprobalo o rechazalo en el panel de gestión, en Gimnasios.',
  ]
    .filter((l, i, a) => l !== '' || a[i - 1] !== '')
    .join('\n');
  try {
    after(() => sendAlert({ subject: `Gimnasio nuevo: ${name}`, text }));
  } catch {
    void sendAlert({ subject: `Gimnasio nuevo: ${name}`, text });
  }
  return { ok: true };
}
