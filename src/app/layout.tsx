import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { getLocale } from '@/i18n/server';

export const metadata: Metadata = {
  title: {
    default: 'FitAI',
    template: '%s · FitAI',
  },
  description: 'Alimentación, entrenamiento, progreso y un entrenador con IA en un solo lugar.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'FitAI', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1115' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
