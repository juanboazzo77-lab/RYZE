'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LOCALE_COOKIE } from '@/i18n/config';
import { updateAppearance } from './actions';
import { AppearanceView } from './appearance-view';
import type { Locale as PrismaLocale, UnitSystem } from '@prisma/client';

export function AppearancePanel({ unitSystem }: { unitSystem: UnitSystem }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setMounted(true), []);

  return (
    <AppearanceView
      theme={mounted ? (theme ?? 'system') : 'system'}
      onTheme={setTheme}
      onLocale={(v) =>
        start(async () => {
          await updateAppearance({ locale: v.toUpperCase() as PrismaLocale });
          document.cookie = `${LOCALE_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
          window.location.reload();
        })
      }
      unitSystem={unitSystem}
      onUnits={(v) =>
        start(async () => {
          await updateAppearance({ unitSystem: v });
          router.refresh();
        })
      }
    />
  );
}
