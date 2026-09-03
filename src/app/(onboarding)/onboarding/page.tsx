import type { Metadata } from 'next';
import { requireUser } from '@/server/context';
import { OnboardingWizard } from '@/features/onboarding/wizard';

export const metadata: Metadata = { title: 'Onboarding' };

export default async function OnboardingPage() {
  const { profile } = await requireUser();

  return (
    <OnboardingWizard
      initial={{
        name: profile.name ?? '',
        unitSystem: profile.unitSystem,
        locale: profile.locale,
      }}
    />
  );
}
