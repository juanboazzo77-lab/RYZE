import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { showAds } from '@/server/entitlements';
import { getT } from '@/i18n/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { RegisterSW } from '@/components/pwa/register-sw';
import { NavTracker } from '@/components/nav-tracker';
import { NotificationPrompt } from '@/features/notifications/notification-prompt';
import { WeighInReminder } from '@/features/notifications/weigh-in-reminder';
import { DeviceReminders } from '@/features/notifications/device-reminders';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RevenueCatInit } from '@/features/billing/revenuecat-init';
import { WidgetSync } from '@/features/widgets/widget-sync';
import { TrainerRouteGuard } from '@/features/trainer/route-guard';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { t }] = await Promise.all([getUserContext(), getT()]);
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  // Cuenta de entrenador: otro menú y sin avisos, widgets ni anuncios de cliente.
  if (ctx.profile.accountType === 'TRAINER') {
    return (
      <AppShell email={ctx.email} showAds={false} adCopy={t.ads} trainer>
        <TrainerRouteGuard />
        <NavTracker />
        <RegisterSW />
        <OfflineIndicator />
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell email={ctx.email} showAds={showAds(ctx.entitlement)} adCopy={t.ads}>
      <NavTracker />
      <NotificationPrompt />
      <WeighInReminder />
      <DeviceReminders />
      <RegisterSW />
      <OfflineIndicator />
      <RevenueCatInit userId={ctx.userId} />
      <WidgetSync />
      {children}
    </AppShell>
  );
}
