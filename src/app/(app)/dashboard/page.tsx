import type { Metadata } from 'next';
import { requireUser } from '@/server/context';
import { getT } from '@/i18n/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Inicio' };

export default async function DashboardPage() {
  const [{ t }, ctx] = await Promise.all([getT(), requireUser()]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{t.common.appName}</p>
        <h1 className="text-2xl font-bold tracking-tight">
          {t.dashboard.title}
          {ctx.profile.name ? `, ${ctx.profile.name}` : ''}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">En construcción</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t.dashboard.placeholder}</CardContent>
      </Card>
    </div>
  );
}
