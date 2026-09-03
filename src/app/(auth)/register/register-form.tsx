'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpAction, type AuthActionState } from '../actions';
import { AuthFormShell, FormMessage, SubmitButton } from '../_ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';

const initial: AuthActionState = {};

export function RegisterForm() {
  const t = useT();
  const [state, action] = useActionState(signUpAction, initial);

  return (
    <form action={action}>
      <AuthFormShell>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t.auth.name}</Label>
          <Input id="name" name="name" type="text" autoComplete="name" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <FormMessage error={state.error} message={state.message} />

        <SubmitButton idle={t.auth.signUp} pending={t.auth.creatingAccount} />

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.haveAccount}{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </AuthFormShell>
    </form>
  );
}
