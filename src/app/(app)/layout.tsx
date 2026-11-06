import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';
import { getApprovedInviteFor } from '@/server/gyms';
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
  if (ctx.ownedGym) {
    // Un dueño de gimnasio tiene su propio panel (/gym). Sin el cuestionario de socio completo, no está
    // obligado a hacerlo: va siempre a su panel. Con el cuestionario hecho, entra al panel salvo que haya
    // elegido usar la app de socio (cookie fz_mode).
    if (ctx.needsOnboarding) redirect('/gym');
    const path = (await headers()).get('x-pathname') ?? '';
    const mode = (await cookies()).get('fz_mode')?.value;
    if (mode !== 'member' && path === '/dashboard') redirect('/gym');
  } else {
    // ¿Su gimnasio la invitó por mail? Si hay una invitación aprobada para su mail, primero la acepta (antes del
    // cuestionario). Se mira al entrar (/dashboard) o cuando falta el cuestionario, no en cada pantalla.
    if (!ctx.gym) {
      const path = (await headers()).get('x-pathname') ?? '';
      const skipped = (await cookies()).get('fz_invite_skip')?.value === '1';
      if (!skipped && (path === '/dashboard' || ctx.needsOnboarding)) {
        const invite = await getApprovedInviteFor(ctx.userId, ctx.email);
        if (invite) redirect('/invitacion');
      }
    }
    if (ctx.needsOnboarding) redirect('/onboarding');
  }

  return (
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
}
