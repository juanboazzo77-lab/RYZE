import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Forza AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">Panel de gimnasios y gestión. Entrá con tu mail.</p>
      </div>
      {error ? <p className="text-sm text-destructive">El enlace venció o ya se usó. Pedí uno nuevo.</p> : null}
      <LoginForm />
      <div className="border-t pt-4 text-center">
        <p className="text-sm text-muted-foreground">¿Tu gimnasio todavía no está en Forza AI?</p>
        <Link href="/solicitar" className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-secondary">
          Soy un gimnasio nuevo: pedir autorización
        </Link>
      </div>
    </div>
  );
}
