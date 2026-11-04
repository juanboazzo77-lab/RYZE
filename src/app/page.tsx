import { redirect } from 'next/navigation';
import { getUserContext } from '@/server/context';

export default async function RootPage() {
  const ctx = await getUserContext();
  // Una cuenta de entrenador entra a su panel; el resto, al inicio de siempre.
  redirect(ctx?.profile.accountType === 'TRAINER' ? '/trainer' : '/dashboard');
}
