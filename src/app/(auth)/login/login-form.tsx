'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signInAction, type AuthActionState } from '../actions';
import { AuthFormShell, FormMessage, SubmitButton } from '../_ui';
import { SocialAuthButtons } from '../_social';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';

const initial: AuthActionState = {};

export function LoginForm() {
  const t = useT();
  const [state, action] = useActionState(signInAction, initial);
  const params = useSearchParams();
  const next = params.get('next') ?? '/dashboard';
  const justReset = params.get('reset') === '1';
  const justDeleted = params.get('deleted') === '1';
  const oauthFailed = params.get('error') === 'auth_callback';

  return (
    <form action={action}>
      <AuthFormShell>
        <input type="hidden" name="next" value={next} />

        <SocialAuthButtons next={next} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t.auth.password}</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:underline">
              {t.auth.forgotPassword}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <FormMessage
          error={state.error ?? (oauthFailed ? t.auth.oauthError : undefined)}
          message={
            state.message ??
            (justReset
              ? t.auth.passwordUpdated
              : justDeleted
                ? t.auth.accountDeleted
                : undefined)
          }
        />

        <SubmitButton idle={t.auth.signIn} pending={t.auth.signingIn} />

        <p className="text-center text-sm text-muted-foreground">
          {t.auth.noAccount}{' '}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            {t.auth.signUp}
          </Link>
        </p>
      </AuthFormShell>
    </form>
  );
}
