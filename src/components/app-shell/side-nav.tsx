'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS } from './nav-items';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function SideNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 px-5 text-lg font-bold tracking-tight">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          G
        </span>
        {t.common.appName}
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-4" />
              {t.nav[labelKey]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
