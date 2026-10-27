import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { showAds } from '@/server/entitlements';
import { getT } from '@/i18n/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { RegisterSW } from '@/components/pwa/register-sw';
import { NavTracker } from '@/components/nav-tracker';
import { NotificationPrompt } from '@/features/notifications/notification-prompt';
import { WeighInReminder } from '@/features/notifications/weigh-in-reminder';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RevenueCatInit } from '@/features/billing/revenuecat-init';
import { WidgetSync } from '@/features/widgets/widget-sync';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { t }] = await Promise.all([getUserContext(), getT()]);
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  return (
    <AppShell email={ctx.email} showAds={showAds(ctx.entitlement)} adCopy={t.ads}>
      <NavTracker />
      <NotificationPrompt />
      <WeighInReminder />
      <RegisterSW />
      <OfflineIndicator />
      <RevenueCatInit userId={ctx.userId} />
      <WidgetSync />
      {children}
    </AppShell>
  );
}
