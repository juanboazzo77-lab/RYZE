import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border bg-card" />}>
      <LoginForm />
    </Suspense>
  );
}
