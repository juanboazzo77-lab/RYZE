'use client';

import { Camera, Pencil, ScanLine, Search, Sparkles } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useT } from '@/i18n/provider';

/** Escanear y foto usan toda la pantalla (la cámara necesita lugar); las demás, la hoja de abajo. */
export const isFullScreenTab = (tab: string) => tab === 'scan' || tab === 'photo';

export const FULL_SCREEN_DIALOG =
  'inset-0 h-dvh max-h-none w-screen max-w-none rounded-none pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))] sm:inset-0 sm:h-dvh sm:max-h-none sm:w-screen sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:rounded-none';

export const FULL_SCREEN_CLOSE = 'top-[calc(1rem+env(safe-area-inset-top))]';

/** Las cinco formas de agregar un alimento. La usan la web y la app. */
export function FoodTabsList() {
  const t = useT();
  const td = t.nutrition.dialog;
  const tabs = [
    ['search', Search, td.searchTab],
    ['scan', ScanLine, td.scanTab],
    ['photo', Camera, td.photoTab],
    ['describe', Sparkles, td.describeTab],
    ['manual', Pencil, td.manualTab],
  ] as const;
  return (
    <TabsList className="h-14 w-full rounded-xl p-1">
      {tabs.map(([value, Icon, label]) => (
        <TabsTrigger key={value} value={value} className="h-full flex-1 flex-col gap-0.5 rounded-lg px-1 py-1 data-[state=active]:text-primary">
          <Icon className="size-[18px]" aria-hidden="true" />
          <span className="text-[11px] leading-none">{label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
