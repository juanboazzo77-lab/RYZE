import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth-shell';
import { PasswordForm } from '@/features/auth/password-form';

export const metadata: Metadata = { title: 'Elegir contraseña' };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Elegí tu contraseña" subtitle="Con ella entrás a tu panel con tu mail. Usá al menos 8 caracteres.">
      <PasswordForm />
    </AuthShell>
  );
}
