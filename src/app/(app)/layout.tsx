import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { AppShell } from '@/components/app-shell/app-shell';
import { RegisterSW } from '@/components/pwa/register-sw';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  return (
    <AppShell email={ctx.email}>
      <RegisterSW />
      {children}
    </AppShell>
  );
}
