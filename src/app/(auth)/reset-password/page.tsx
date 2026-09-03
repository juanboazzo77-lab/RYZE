import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ResetForm } from './reset-form';
import { getSession } from '@/server/context';

export const metadata: Metadata = { title: 'Restablecer contraseña' };

export default async function ResetPasswordPage() {
  // Se llega acá con una sesión de recuperación creada por /auth/callback.
  const user = await getSession();
  if (!user) redirect('/forgot-password');

  return <ResetForm />;
}
