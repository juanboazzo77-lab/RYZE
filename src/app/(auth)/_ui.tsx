'use client';

import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/provider';

export function AuthFormShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-xl border bg-card p-6 shadow-sm', className)}>
      {children}
    </div>
  );
}

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground" role="status">
        {message}
      </p>
    );
  }
  return null;
}

export function SubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={isPending}>
      {isPending ? pending : idle}
    </Button>
  );
}

/** "Al crear una cuenta aceptás nuestros Términos... y nuestra Política...". */
export function LegalNotice() {
  const t = useT();
  const [before, mid, after] = t.auth.legalNotice.split(/\{terms\}|\{privacy\}/);
  return (
    <p className="text-center text-xs text-muted-foreground">
      {before}
      <Link href="/terms" className="underline hover:text-foreground" target="_blank">
        {t.auth.termsLink}
      </Link>
      {mid}
      <Link href="/privacy" className="underline hover:text-foreground" target="_blank">
        {t.auth.privacyLink}
      </Link>
      {after}
    </p>
  );
}
