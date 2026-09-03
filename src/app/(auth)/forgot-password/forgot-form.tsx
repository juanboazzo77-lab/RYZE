'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction, type AuthActionState } from '../actions';
import { AuthFormShell, FormMessage, SubmitButton } from '../_ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';

const initial: AuthActionState = {};

export function ForgotForm() {
  const t = useT();
  const [state, action] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action}>
      <AuthFormShell>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <FormMessage error={state.error} message={state.message} />

        <SubmitButton idle={t.auth.sendResetLink} pending={t.common.loading} />

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t.common.back}
          </Link>
        </p>
      </AuthFormShell>
    </form>
  );
}
