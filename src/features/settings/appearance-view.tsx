'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/form/field';
import { Segmented } from '@/components/form/segmented';
import { NativeSelect } from '@/components/ui/native-select';
import { useI18n } from '@/i18n/provider';
import { LOCALES, type Locale } from '@/i18n/config';

const LANGUAGE_LABELS: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

export type ThemeChoice = 'light' | 'dark' | 'system';

/** Tema, idioma y unidades. Lo usan la web y la app; cada una dice cómo se guarda. */
export function AppearanceView({
  theme,
  onTheme,
  onLocale,
  unitSystem,
  onUnits,
}: {
  theme: string;
  onTheme: (theme: ThemeChoice) => void;
  onLocale: (locale: Locale) => void;
  unitSystem: 'METRIC' | 'IMPERIAL';
  onUnits: (unitSystem: 'METRIC' | 'IMPERIAL') => void;
}) {
  const { t, locale } = useI18n();

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
            value={theme}
            onChange={(v) => onTheme(v as ThemeChoice)}
          />
        </Field>

        <Field label={t.settings.language}>
          <NativeSelect value={locale} aria-label={t.settings.language} onChange={(e) => onLocale(e.target.value as Locale)}>
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
            onChange={(v) => onUnits(v as 'METRIC' | 'IMPERIAL')}
          />
        </Field>
      </CardContent>
    </Card>
  );
}
