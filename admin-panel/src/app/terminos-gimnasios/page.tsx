import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { GymTerms, TERMS_DATE } from '@/features/legal/gym-terms';

export const metadata: Metadata = { title: 'Términos para gimnasios' };

/** Pública: los términos que acepta cada gimnasio al pedir el alta. */
export default function GymTermsPage() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link href="/solicitar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Volver
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Términos y condiciones para gimnasios</h1>
      <p className="mt-1 text-xs text-muted-foreground">Última actualización: {TERMS_DATE}</p>
      <GymTerms />
    </div>
  );
}
