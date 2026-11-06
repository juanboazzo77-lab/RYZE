'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { applyAsGym } from './public-actions';
import { GYM } from './copy';

/** Formulario público para que un gimnasio pida sumarse. */
export function GymApplyForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const estimate = Number(f.get('memberEstimate'));
    setError(null);
    start(async () => {
      const res = await applyAsGym({
        name: String(f.get('name') ?? ''),
        city: String(f.get('city') ?? ''),
        contactName: String(f.get('contactName') ?? ''),
        contactEmail: String(f.get('contactEmail') ?? ''),
        contactPhone: String(f.get('contactPhone') ?? ''),
        memberEstimate: Number.isFinite(estimate) && estimate > 0 ? estimate : undefined,
        message: String(f.get('message') ?? ''),
        website: String(f.get('website') ?? ''),
      });
      if (res.ok) setSent(true);
      else setError(res.error === 'INVALID' ? GYM.errInvalid : res.error === 'TOO_MANY' ? GYM.errTooMany : GYM.errGeneric);
    });
  }

  if (sent) {
    return (
      <div className="rounded-xl border p-5">
        <p className="font-semibold">{GYM.sentTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{GYM.sentText}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={GYM.fName}>
        <Input name="name" required maxLength={120} autoComplete="organization" />
      </Field>
      <Field label={GYM.fCity}>
        <Input name="city" maxLength={80} />
      </Field>
      <Field label={GYM.fContactName}>
        <Input name="contactName" required maxLength={120} autoComplete="name" />
      </Field>
      <Field label={GYM.fEmail}>
        <Input name="contactEmail" type="email" required maxLength={200} autoComplete="email" />
      </Field>
      <Field label={GYM.fPhone}>
        <Input name="contactPhone" type="tel" maxLength={40} autoComplete="tel" />
      </Field>
      <Field label={GYM.fMembers}>
        <Input name="memberEstimate" type="number" inputMode="numeric" min={0} max={100000} />
      </Field>
      <Field label={GYM.fMessage}>
        <textarea name="message" rows={3} maxLength={600} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>
      {/* Trampa para robots: escondido para las personas. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          No completar
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? GYM.sending : GYM.send}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
