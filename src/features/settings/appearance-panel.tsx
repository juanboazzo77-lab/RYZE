'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/form/field';
import { Segmented } from '@/components/form/segmented';
import { NativeSelect } from '@/components/ui/native-select';
import { useI18n } from '@/i18n/provider';
import { LOCALE_COOKIE, LOCALES, type Locale } from '@/i18n/config';
import { updateAppearance } from './actions';
import type { Locale as PrismaLocale, UnitSystem } from '@prisma/client';

const LANGUAGE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

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
          <NativeSelect
            value={locale}
            onChange={(e) => {
              const v = e.target.value as Locale;
              start(async () => {
                await updateAppearance({ locale: v.toUpperCase() as PrismaLocale });
                document.cookie = `${LOCALE_COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
                window.location.reload();
              });
            }}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABELS[l]}
              </option>
            ))}
          </NativeSelect>
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
