import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { AuthShell } from '@/components/auth-shell';
import { GymApplyForm } from '@/features/gym/apply-form';
import { GYM } from '@/features/gym/copy';

export const metadata: Metadata = { title: 'Sumar mi gimnasio' };

/** Pública: un gimnasio nuevo pide autorización. Queda pendiente hasta que el administrador la aprueba. */
export default function ApplyPage() {
  return (
    <AuthShell title={GYM.applyTitle} subtitle={GYM.applyIntro} wide>
      <GymApplyForm />
      <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        Volver a ingresar
      </Link>
    </AuthShell>
  );
}
