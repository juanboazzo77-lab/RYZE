import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { ExportButton } from '@/features/account/export-button';
import { DeleteAccountDialog } from '@/features/account/delete-account-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Cuenta' };

export default async function AccountSettingsPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  return (
    <div className="space-y-4">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {t.settings.title}
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{t.account.title}</h1>
      <p className="text-sm text-muted-foreground">{ctx.email}</p>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t.account.exportTitle}</CardTitle>
          <CardDescription>{t.account.exportDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <ExportButton />
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">{t.account.dangerTitle}</CardTitle>
          <CardDescription>{t.account.dangerDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
