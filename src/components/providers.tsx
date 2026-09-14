'use client';

import { ThemeProvider } from './theme-provider';
import { Toaster } from './ui/sonner';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n';

export function Providers({
  locale,
  t,
  children,
}: {
  locale: Locale;
  t: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale} t={t}>
        {children}
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
