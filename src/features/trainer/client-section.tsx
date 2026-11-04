'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { acceptTrainerCode, previewTrainerCode, stopSharingWithTrainer } from './actions';
import { fill, TC } from './copy';

const ERRORS: Record<string, string> = {
  INVALID_CODE: TC.codeInvalid,
  SELF: TC.codeSelf,
  ALREADY_LINKED: TC.codeAlready,
  TRAINER_FULL: TC.codeFull,
  TRAINER_ACCOUNT: TC.codeTrainerAccount,
};

/** El cliente ingresa el código, ve de quién es y acepta compartir sus datos. */
export function LinkWithTrainer() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [trainer, setTrainer] = useState<{ displayName: string; credential: string | null } | null>(null);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();

  function lookup() {
    if (!code.trim()) return;
    start(async () => {
      const res = await previewTrainerCode({ code });
      if (res.ok && res.data) setTrainer(res.data);
      else toast.error(ERRORS[res.error ?? ''] ?? TC.error);
    });
  }

  function accept() {
    if (!consent) return;
    start(async () => {
      const res = await acceptTrainerCode({ code, consent });
      if (res.ok) {
        toast.success(TC.consentAccept);
        router.refresh();
      } else {
        toast.error(ERRORS[res.error ?? ''] ?? TC.error);
        setTrainer(null);
        setConsent(false);
      }
    });
  }

  if (!trainer) {
    return (
      <div className="space-y-2">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{TC.codeLabel}</span>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  lookup();
                }
              }}
              placeholder={TC.codePlaceholder}
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              className="flex-1 tracking-widest"
            />
            <Button onClick={lookup} disabled={pending || !code.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {TC.codeContinue}
            </Button>
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 text-sm">
      <p className="font-medium">{fill(TC.consentTitle, { name: trainer.displayName })}</p>
      {trainer.credential ? <p className="text-xs text-muted-foreground">{trainer.credential}</p> : null}
      <p>{TC.consentShare}</p>
      <p className="text-muted-foreground">{TC.consentNot}</p>
      <p className="text-muted-foreground">{TC.consentStop}</p>
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[hsl(var(--primary))]"
        />
        <span>{TC.consentCheck}</span>
      </label>
      <div className="flex gap-2">
        <Button onClick={accept} disabled={pending || !consent}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {TC.consentAccept}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setTrainer(null);
            setConsent(false);
          }}
          disabled={pending}
        >
          {TC.consentCancel}
        </Button>
      </div>
    </div>
  );
}

/** El cliente deja de compartir sus datos con su entrenador. */
export function StopSharingButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function stop() {
    if (!confirm(TC.stopConfirm)) return;
    start(async () => {
      const res = await stopSharingWithTrainer();
      if (res.ok) {
        toast.success(TC.stopped);
        router.refresh();
      } else toast.error(TC.error);
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={stop} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {TC.stop}
    </Button>
  );
}
