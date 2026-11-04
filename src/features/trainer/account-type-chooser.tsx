'use client';

import { useState } from 'react';
import { Dumbbell, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApplyAsTrainerForm } from './trainer-section';
import { ACCOUNT } from './copy';

/**
 * Primera pantalla de una cuenta nueva: cliente o entrenador. Cliente sigue con el cuestionario de
 * siempre (`children`); entrenador sólo pide nombre y título y va directo a su panel.
 */
export function AccountTypeChooser({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<'CHOOSE' | 'CLIENT' | 'TRAINER'>('CHOOSE');

  if (choice === 'CLIENT') return <>{children}</>;

  if (choice === 'TRAINER') {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{ACCOUNT.trainerFormTitle}</h1>
          <p className="text-sm text-muted-foreground">{ACCOUNT.trainerFormIntro}</p>
        </div>
        <ApplyAsTrainerForm />
        <Button variant="ghost" size="sm" onClick={() => setChoice('CHOOSE')}>
          {ACCOUNT.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-4 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{ACCOUNT.title}</h1>
        <p className="text-sm text-muted-foreground">{ACCOUNT.subtitle}</p>
      </div>
      <button type="button" onClick={() => setChoice('CLIENT')} className="block w-full text-left">
        <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50">
          <Dumbbell className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <span className="block font-semibold">{ACCOUNT.clientTitle}</span>
            <span className="block text-sm text-muted-foreground">{ACCOUNT.clientDesc}</span>
          </span>
        </Card>
      </button>
      <button type="button" onClick={() => setChoice('TRAINER')} className="block w-full text-left">
        <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50">
          <UserCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            <span className="block font-semibold">{ACCOUNT.trainerTitle}</span>
            <span className="block text-sm text-muted-foreground">{ACCOUNT.trainerDesc}</span>
          </span>
        </Card>
      </button>
    </div>
  );
}
