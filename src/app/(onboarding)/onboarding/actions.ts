'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { prisma } from '@/server/db';

/**
 * Placeholder de la Fase 1: marca el onboarding como completo para poder
 * navegar la app. La Fase 2 reemplaza esta ruta por el wizard real
 * (perfil + objetivos + targets nutricionales calculados).
 */
export async function completeOnboardingStub() {
  const { userId } = await requireUser();
  await prisma.profile.update({
    where: { id: userId },
    data: { onboardingCompletedAt: new Date() },
  });
  redirect('/dashboard');
}
