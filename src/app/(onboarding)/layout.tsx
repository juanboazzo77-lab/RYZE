import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (!ctx.needsOnboarding) redirect('/dashboard');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      {children}
    </div>
  );
}
