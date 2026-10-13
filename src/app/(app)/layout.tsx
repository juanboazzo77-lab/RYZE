import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { showAds } from '@/server/entitlements';
import { getT } from '@/i18n/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { RegisterSW } from '@/components/pwa/register-sw';
import { NavTracker } from '@/components/nav-tracker';
import { NotificationPrompt } from '@/features/notifications/notification-prompt';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RevenueCatInit } from '@/features/billing/revenuecat-init';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { t }] = await Promise.all([getUserContext(), getT()]);
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  return (
    <AppShell email={ctx.email} showAds={showAds(ctx.entitlement)} adCopy={t.ads}>
      <NavTracker />
      <NotificationPrompt />
      <RegisterSW />
      <OfflineIndicator />
      <RevenueCatInit userId={ctx.userId} />
      {children}
    </AppShell>
  );
}
