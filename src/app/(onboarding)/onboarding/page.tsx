import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/context';
import { OnboardingWizard } from '@/features/onboarding/wizard';
import { AccountTypeChooser } from '@/features/trainer/account-type-chooser';

export const metadata: Metadata = { title: 'Onboarding' };

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const [{ profile }, sp] = await Promise.all([requireUser(), searchParams]);
  // Una cuenta de entrenador no hace el cuestionario de cliente.
  if (profile.accountType === 'TRAINER') redirect('/trainer');

  return (
    <AccountTypeChooser skip={sp.client === '1'}>
      <OnboardingWizard
        initial={{
          name: profile.name ?? '',
          unitSystem: profile.unitSystem,
          locale: profile.locale,
        }}
      />
    </AccountTypeChooser>
  );
}

/** Las acciones de esta pantalla llaman a la IA con fotos: necesitan más que los 10 s por defecto. */
export const maxDuration = 60;
