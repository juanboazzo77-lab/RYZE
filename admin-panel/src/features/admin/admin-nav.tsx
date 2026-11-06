'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: 'Hoy' },
  { href: '/errores', label: 'Errores' },
  { href: '/suscriptores', label: 'Suscriptores' },
  { href: '/altas', label: 'Altas' },
  { href: '/gimnasios', label: 'Gimnasios' },
  { href: '/cobros', label: 'Cobros' },
  { href: '/numeros', label: 'Números' },
] as const;

/** Menú del centro de gestión: se desliza de costado en el celular. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 pb-2 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0" aria-label="Centro de gestión">
      {ITEMS.map((i) => {
        const active = i.href === '/' ? pathname === '/' : pathname.startsWith(i.href);
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
