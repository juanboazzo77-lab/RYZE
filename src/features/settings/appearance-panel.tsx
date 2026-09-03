'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/form/field';
import { Segmented } from '@/components/form/segmented';
import { useI18n } from '@/i18n/provider';
import { LOCALE_COOKIE } from '@/i18n/config';
import { updateAppearance } from './actions';
import type { UnitSystem } from '@prisma/client';

export function AppearancePanel({ unitSystem }: { unitSystem: UnitSystem }) {
  const { t, locale } = useI18n();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [, start] = useTransition();
  useEffect(() => setMounted(true), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.settings.appearance}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label={t.settings.theme}>
          <Segmented
            options={[
              { value: 'light', label: t.settings.themeLight },
              { value: 'dark', label: t.settings.themeDark },
              { value: 'system', label: t.settings.themeSystem },
            ]}
            value={mounted ? (theme ?? 'system') : 'system'}
            onChange={(v) => setTheme(v)}
          />
        </Field>

        <Field label={t.settings.language}>
          <Segmented
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
            ]}
            value={locale}
            onChange={(v) => {
              start(async () => {
                await updateAppearance({ locale: v === 'en' ? 'EN' : 'ES' });
                document.cookie = `${LOCALE_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                window.location.reload();
              });
            }}
          />
        </Field>

        <Field label={t.settings.units}>
          <Segmented
            options={[
              { value: 'METRIC', label: t.settings.unitsMetric },
              { value: 'IMPERIAL', label: t.settings.unitsImperial },
            ]}
            value={unitSystem}
            onChange={(v) => {
              start(async () => {
                await updateAppearance({ unitSystem: v as UnitSystem });
                router.refresh();
              });
            }}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
