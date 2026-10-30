import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (!ctx.needsOnboarding) redirect('/dashboard');

  return (
    <div className="min-h-screen w-full px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-12 sm:pt-[calc(3rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
