import type { Metadata } from 'next';
import { getT } from '@/i18n/server';
import { completeOnboardingStub } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Onboarding' };

export default async function OnboardingPage() {
  const { t } = await getT();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.onboarding.title}</CardTitle>
        <CardDescription>{t.onboarding.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.onboarding.comingSoon}</p>
        <form action={completeOnboardingStub}>
          <Button type="submit" size="lg" className="w-full">
            {t.onboarding.finishLater}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
