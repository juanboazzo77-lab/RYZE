'use client';

import { ThemeProvider } from './theme-provider';
import { Toaster } from './ui/sonner';
import { I18nProvider } from '@/i18n/provider';
import type { Locale } from '@/i18n/config';

export function Providers({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider locale={locale}>
        {children}
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
