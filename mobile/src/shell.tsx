import type { ReactNode } from 'react';
import { Monitor, Moon, Settings, Sun } from 'lucide-react';
import { NAV_ITEMS } from '@/components/app-shell/nav-items';
import { Button } from '@/components/ui/button';
import type { Dictionary } from '@/i18n';
import { cn } from '@/lib/utils';
import logo from '../../public/brand/logo.png';
import { useTheme } from './theme';

export type Tab = (typeof NAV_ITEMS)[number]['labelKey'];

/** El marco de la app: el mismo encabezado y la misma barra de abajo que la web (`src/components/app-shell`). */
export function Shell({
  t,
  tab,
  onTab,
  onSettings,
  banner,
  children,
}: {
  t: Dictionary;
  tab: Tab | null;
  onTab: (tab: Tab) => void;
  onSettings: () => void;
  banner?: ReactNode;
  children: ReactNode;
}) {
  const { theme, next } = useTheme();
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-3 border-b bg-card/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button type="button" onClick={() => onTab('home')} className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg border bg-white p-1 shadow-sm">
            <img src={logo} alt="" width={24} height={24} />
          </span>
          <span className="text-sm font-bold tracking-tight">FORZA AI</span>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Cambiar tema" onClick={next}>
            <ThemeIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t.nav.settings} onClick={onSettings}>
            <Settings className="size-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5">
        {banner}
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur">
        <ul className="mx-auto grid max-w-lg grid-cols-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_ITEMS.map(({ labelKey, icon: Icon }) => {
            const active = tab === labelKey;
            return (
              <li key={labelKey}>
                <button
                  type="button"
                  onClick={() => onTab(labelKey)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className={cn('size-5', active && 'stroke-[2.5]')} />
                  {t.nav[labelKey]}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
