'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, CalendarDays, ClipboardList, Dumbbell, Home, MoreHorizontal, Palette, QrCode, Receipt, Tags, Trophy, Users, Wallet, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Nombre corto para la barra de abajo del celular. */
  short?: string;
  /** Va en la barra de abajo del celular (el resto queda en "Más"). */
  main?: boolean;
}

interface Group {
  title: string;
  items: Item[];
}

/** El menú, agrupado por lo que el dueño hace: el día a día, lo que ofrece a sus clientes y la configuración. */
const GROUPS: Group[] = [
  {
    title: 'Día a día',
    items: [
      { href: '/gym', label: 'Resumen', icon: Home, main: true },
      { href: '/gym/clientes', label: 'Clientes y cuotas', short: 'Clientes', icon: Users, main: true },
      { href: '/gym/cobros', label: 'Cobros', icon: Wallet, main: true },
      { href: '/gym/planes', label: 'Planes del gimnasio', icon: Tags },
    ],
  },
  {
    title: 'Con Forza AI',
    items: [
      { href: '/gym/invitaciones', label: 'Mi QR e invitar', short: 'Mi QR', icon: QrCode, main: true },
      { href: '/gym/socios', label: 'Quién entrena', icon: Activity },
      { href: '/gym/clases', label: 'Clases', icon: CalendarDays },
      { href: '/gym/retos', label: 'Retos', icon: Trophy },
      { href: '/gym/rutinas', label: 'Rutinas', icon: ClipboardList },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { href: '/gym/marca', label: 'Marca', icon: Palette },
      { href: '/gym/equipamiento', label: 'Equipamiento', icon: Dumbbell },
      { href: '/gym/facturacion', label: 'Lo que pagás a Forza AI', icon: Receipt },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const MAIN = ALL.filter((i) => i.main);

const isActive = (pathname: string, href: string) => (href === '/gym' ? pathname === '/gym' : pathname.startsWith(href));

/**
 * Menú del panel del gimnasio. En la computadora es una barra lateral con secciones; en el celular, una barra abajo con
 * lo principal y un botón "Más" que abre el resto (así nada queda escondido fuera de la pantalla).
 */
export function GymNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Al navegar se cierra el menú "Más".
  useEffect(() => setOpen(false), [pathname]);

  const moreActive = ALL.some((i) => !i.main && isActive(pathname, i.href));

  return (
    <>
      {/* Computadora: barra lateral */}
      <nav className="hidden lg:block" aria-label="Panel del gimnasio">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-5">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={isActive(pathname, i.href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive(pathname, i.href) ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <i.icon className="size-4 shrink-0" aria-hidden="true" />
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Celular: barra de abajo */}
      <div className="lg:hidden print:hidden">
        {open ? (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
        ) : null}
        {open ? (
          <div className="fixed inset-x-0 bottom-16 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t bg-background p-4 shadow-xl" role="dialog" aria-label="Todas las secciones">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Todas las secciones</p>
              <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full hover:bg-secondary" aria-label="Cerrar">
                <X className="size-4" />
              </button>
            </div>
            {GROUPS.map((g) => (
              <div key={g.title} className="mb-4 last:mb-0">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {g.items.map((i) => (
                    <Link
                      key={i.href}
                      href={i.href}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-3 text-sm',
                        isActive(pathname, i.href) ? 'border-primary bg-primary/10 font-medium' : 'hover:bg-secondary',
                      )}
                    >
                      <i.icon className="size-4 shrink-0" aria-hidden="true" />
                      <span className="leading-tight">{i.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur" aria-label="Panel del gimnasio">
          {MAIN.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isActive(pathname, i.href) ? 'page' : undefined}
              className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', isActive(pathname, i.href) ? 'font-semibold text-primary' : 'text-muted-foreground')}
            >
              <i.icon className="size-5" aria-hidden="true" />
              <span className="max-w-full truncate px-1">{i.short ?? i.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]', open || moreActive ? 'font-semibold text-primary' : 'text-muted-foreground')}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
            Más
          </button>
        </nav>
      </div>
    </>
  );
}
