import Link from 'next/link';
import { getT } from '@/i18n/server';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getT();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              G
            </span>
            {t.common.appName}
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">{t.auth.tagline}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
