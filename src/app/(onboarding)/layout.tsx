import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (!ctx.needsOnboarding) redirect('/dashboard');

  return (
    <div className="min-h-screen w-full px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
