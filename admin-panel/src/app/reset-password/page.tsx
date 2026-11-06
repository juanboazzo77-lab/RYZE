import type { Metadata } from 'next';
import { PasswordForm } from '@/features/auth/password-form';

export const metadata: Metadata = { title: 'Elegir contraseña' };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Elegí tu contraseña</h1>
        <p className="mt-1 text-sm text-muted-foreground">Con ella vas a entrar a tu panel con tu mail. Usá al menos 8 caracteres.</p>
      </div>
      <PasswordForm />
    </div>
  );
}
