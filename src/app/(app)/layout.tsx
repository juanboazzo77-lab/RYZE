import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { brandTheme } from '@/features/gym/brand';
import { showAds } from '@/server/entitlements';
import { getT } from '@/i18n/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { RegisterSW } from '@/components/pwa/register-sw';
import { NavTracker } from '@/components/nav-tracker';
import { NotificationPrompt } from '@/features/notifications/notification-prompt';
import { WeighInReminder } from '@/features/notifications/weigh-in-reminder';
import { DeviceReminders } from '@/features/notifications/device-reminders';
import { NativePush } from '@/features/notifications/native-push';
import { OfflineIndicator } from '@/components/pwa/offline-indicator';
import { RevenueCatInit } from '@/features/billing/revenuecat-init';
import { WidgetSync } from '@/features/widgets/widget-sync';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { t }] = await Promise.all([getUserContext(), getT()]);
  if (!ctx) redirect('/login');
  if (ctx.needsOnboarding) redirect('/onboarding');

  // Si es socio de un gimnasio con su marca cargada, la app toma sus colores.
  const theme = brandTheme(ctx.gym?.brandColor);

  const shell = (
    <AppShell email={ctx.email} showAds={showAds(ctx.entitlement)} adCopy={t.ads}>
      <NavTracker />
      <NotificationPrompt />
      <WeighInReminder />
      <DeviceReminders />
      <NativePush />
      <RegisterSW />
      <OfflineIndicator />
      <RevenueCatInit userId={ctx.userId} />
      <WidgetSync />
      {children}
    </AppShell>
  );
  // display: contents → el div no cambia el diseño; solo reparte las variables de color a todo lo de adentro.
  return theme ? <div style={{ display: 'contents', ...theme }}>{shell}</div> : shell;
}
