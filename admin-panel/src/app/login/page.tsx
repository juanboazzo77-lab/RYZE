import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forza AI · Gestión</h1>
        <p className="mt-1 text-sm text-muted-foreground">Panel privado. Entrás con un enlace que te llega por mail.</p>
      </div>
      {error ? <p className="text-sm text-destructive">El enlace venció o ya se usó. Pedí uno nuevo.</p> : null}
      <LoginForm />
    </div>
  );
}
