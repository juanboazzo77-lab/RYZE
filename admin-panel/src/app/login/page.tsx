import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Ingresá a tu panel" subtitle="Gimnasios y gestión de Forza AI.">
      {error ? <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">El enlace venció o ya se usó. Pedí uno nuevo.</p> : null}
      <LoginForm />
      <div className="border-t pt-4 text-center">
        <p className="text-sm text-muted-foreground">¿Tu gimnasio todavía no está en Forza AI?</p>
        <Link
          href="/solicitar"
          className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Soy un gimnasio nuevo: pedir autorización
        </Link>
      </div>
    </AuthShell>
  );
}
