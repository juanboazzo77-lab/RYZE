import Link from 'next/link';
import { CalendarDays, LogOut, Settings } from 'lucide-react';
import { BottomNav } from './bottom-nav';
import { SideNav } from './side-nav';
import { ThemeToggle } from './theme-toggle';
import { signOutAction } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { AdSlot } from '@/components/ad-slot';
import type { Dictionary } from '@/i18n';

export function AppShell({
  email,
  showAds,
  adCopy,
  children,
}: {
  email: string;
  showAds: boolean;
  adCopy: Dictionary['ads'];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-card/95 px-4 backdrop-blur">
          <span className="text-sm font-semibold md:hidden">RYZE</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline">
              {email}
            </span>
            <Button variant="ghost" size="icon" aria-label="Calendario" asChild>
              <Link href="/calendar">
                <CalendarDays className="size-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="Ajustes" asChild>
              <Link href="/settings">
                <Settings className="size-4" />
              </Link>
            </Button>
            <form action={signOutAction} className="hidden md:block">
              <Button variant="ghost" size="icon" type="submit" aria-label="Cerrar sesión">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-8">
          {showAds ? <AdSlot label={adCopy.placeholder} removeAdsLabel={adCopy.removeAds} /> : null}
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
