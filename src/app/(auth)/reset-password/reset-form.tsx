'use client';

import { useActionState } from 'react';
import { updatePasswordAction, type AuthActionState } from '../actions';
import { AuthFormShell, FormMessage, SubmitButton } from '../_ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';

const initial: AuthActionState = {};

export function ResetForm() {
  const t = useT();
  const [state, action] = useActionState(updatePasswordAction, initial);

  return (
    <form action={action}>
      <AuthFormShell>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t.auth.newPassword}</Label>
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

        <SubmitButton idle={t.auth.resetPassword} pending={t.common.loading} />
      </AuthFormShell>
    </form>
  );
}
