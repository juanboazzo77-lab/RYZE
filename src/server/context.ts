import 'server-only';
import { cache } from 'react';
import type { Entitlement, Profile } from '@prisma/client';
import { createSupabaseServerClient } from './supabase/server';
import { prisma } from './db';

export interface UserContext {
  userId: string;
  email: string;
  profile: Profile;
  entitlement: Entitlement;
  /** true hasta que el usuario termina el onboarding. */
  needsOnboarding: boolean;
}

/** Usuario autenticado en Supabase (o null). Memoizado por request. */
export const getSession = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Contexto del request: usuario + profile + entitlement. `null` si no hay sesión.
 * Self-heal: garantiza las filas `profile` y `entitlement` aunque el trigger
 * `handle_new_user` no haya corrido (p. ej. usuario creado por script).
 */
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  const user = await getSession();
  if (!user) return null;

  const profile = await prisma.profile.upsert({
    where: { id: user.id },
    update: { email: user.email ?? undefined },
    create: {
      id: user.id,
      email: user.email ?? `${user.id}@sin-email.local`,
      name: (user.user_metadata?.full_name as string | undefined) ?? null,
    },
  });

  const entitlement = await prisma.entitlement.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return {
    userId: profile.id,
    email: profile.email,
    profile,
    entitlement,
    needsOnboarding: profile.onboardingCompletedAt === null,
  };
});

/** Igual que getUserContext pero lanza si no hay sesión. */
export async function requireUser(): Promise<UserContext> {
  const ctx = await getUserContext();
  if (!ctx) throw new Error('NO_SESSION');
  return ctx;
}
