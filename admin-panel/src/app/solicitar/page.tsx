import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { GymApplyForm } from '@/features/gym/apply-form';
import { GYM } from '@/features/gym/copy';

export const metadata: Metadata = { title: 'Sumar mi gimnasio' };

/** Pública: un gimnasio nuevo pide autorización. Queda pendiente hasta que el administrador la aprueba. */
export default function ApplyPage() {
  return (
    <div className="mx-auto min-h-screen max-w-md px-4 py-10">
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Volver
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{GYM.applyTitle}</h1>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-muted-foreground">{GYM.applyIntro}</p>
      <GymApplyForm />
      <p className="mt-6 text-center text-xs text-muted-foreground">
        ¿Preferís escribirnos?{' '}
        <a className="underline hover:text-foreground" href="mailto:gimnasios@forzaai.app">
          gimnasios@forzaai.app
        </a>
      </p>
    </div>
  );
}
