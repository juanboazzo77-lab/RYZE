import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { AppShell } from '@/components/app-shell/app-shell';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  return <AppShell email={ctx.email}>{children}</AppShell>;
}
