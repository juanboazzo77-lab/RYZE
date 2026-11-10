import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl border bg-card" />}>
      <RegisterForm />
    </Suspense>
  );
}
