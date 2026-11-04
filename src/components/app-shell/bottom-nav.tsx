'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, TRAINER_NAV_ITEMS } from './nav-items';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

export function BottomNav({ trainer = false }: { trainer?: boolean }) {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur md:hidden">
      <ul
        className={cn('mx-auto grid max-w-lg', trainer ? 'grid-cols-3' : 'grid-cols-5')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {(trainer
          ? TRAINER_NAV_ITEMS.map((i) => ({ href: i.href, label: i.label, icon: i.icon }))
          : NAV_ITEMS.map((i) => ({ href: i.href, label: t.nav[i.labelKey], icon: i.icon }))
        ).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
