import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { getApprovedInviteFor } from '@/server/gyms';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (!ctx.needsOnboarding) redirect('/dashboard');
  // Si su gimnasio la invitó por mail, acepta la invitación antes de hacer el cuestionario.
  if (!ctx.gym && (await cookies()).get('fz_invite_skip')?.value !== '1') {
    if (await getApprovedInviteFor(ctx.userId, ctx.email)) redirect('/invitacion');
  }

  return (
    <div className="min-h-screen w-full px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-12 sm:pt-[calc(3rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
