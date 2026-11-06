'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/gym', label: 'Resumen' },
  { href: '/gym/clientes', label: 'Clientes' },
  { href: '/gym/cobros', label: 'Cobros' },
  { href: '/gym/socios', label: 'Con Forza AI' },
  { href: '/gym/invitaciones', label: 'Invitar' },
  { href: '/gym/rutinas', label: 'Rutinas' },
  { href: '/gym/clases', label: 'Clases' },
  { href: '/gym/retos', label: 'Retos' },
  { href: '/gym/marca', label: 'Marca' },
  { href: '/gym/equipamiento', label: 'Equipamiento' },
] as const;

/** Menú del panel del gimnasio. */
export function GymNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0" aria-label="Panel del gimnasio">
      {ITEMS.map((i) => {
        const active = i.href === '/gym' ? pathname === '/gym' : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors lg:rounded-lg lg:px-3 lg:py-2',
              active ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
