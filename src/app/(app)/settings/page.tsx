import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  CreditCard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  User,
} from 'lucide-react';
import { getT } from '@/i18n/server';
import { requireUser } from '@/server/context';
import { can } from '@/server/entitlements';
import { signOutAction } from '@/app/(auth)/actions';
import { AppearancePanel } from '@/features/settings/appearance-panel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function SettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  const rows: Array<{ href?: string; icon: typeof User; title: string; desc: string; badge?: string }> = [
    { href: '/settings/profile', icon: User, title: t.settings.profile, desc: t.settings.profileDesc },
    { href: '/settings/goals', icon: Target, title: t.settings.goals, desc: t.settings.goalsDesc },
    { href: '/settings/sports', icon: Trophy, title: t.settings.sports, desc: t.settings.sportsDesc },
    {
      href: '/settings/about',
      icon: Sparkles,
      title: t.coachProfile.settingsRow,
      desc: t.coachProfile.settingsRowDesc,
      badge: can(ctx.entitlement, 'coach_profile') ? undefined : t.pro.coachTierBadge,
    },
    {
      href: '/settings/plans',
      icon: CreditCard,
      title: t.plans.title,
      desc: t.plans.settingsDesc,
    },
    {
      href: '/settings/notifications',
      icon: Bell,
      title: t.settings.notifications,
      desc: t.settings.notificationsDesc,
    },
    { href: '/settings/account', icon: ShieldCheck, title: t.settings.account, desc: t.settings.accountDesc },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">{t.settings.title}</h1>

      <Card className="divide-y">
        {rows.map((r) => {
          const inner = (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <r.icon className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {r.title}
                  {r.badge ? <Badge className="text-[10px]">{r.badge}</Badge> : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">{r.desc}</div>
              </div>
              {r.href ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
            </div>
          );
          return r.href ? (
            <Link key={r.title} href={r.href} className="block hover:bg-secondary/50">
              {inner}
            </Link>
          ) : (
            <div key={r.title} className="opacity-60">
              {inner}
            </div>
          );
        })}
      </Card>

      <AppearancePanel unitSystem={ctx.profile.unitSystem} />

      <form action={signOutAction}>
        <Button type="submit" variant="outline" className="w-full">
          <LogOut className="size-4" />
          {t.auth.signOut}
        </Button>
      </form>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        {ctx.email}
        {' · '}
        <Link href="/privacy" className="underline hover:text-foreground">
          {t.auth.privacyLink}
        </Link>
        {' · '}
        <Link href="/terms" className="underline hover:text-foreground">
          {t.auth.termsLink}
        </Link>
      </p>
    </div>
  );
}
