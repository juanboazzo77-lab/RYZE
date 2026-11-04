'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Copy, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { chooseTrainerAccount, renewInviteCode } from './actions';
import { TC } from './copy';

/** El entrenador pide acceso: nombre, presentación y título o certificado. */
export function ApplyAsTrainerForm() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [credential, setCredential] = useState('');
  const [pending, start] = useTransition();

  const valid = displayName.trim().length >= 2 && credential.trim().length >= 3;

  function submit() {
    if (!valid) return;
    start(async () => {
      const res = await chooseTrainerAccount({ displayName, bio, credential });
      if (res.ok) {
        toast.success(TC.applied);
        // La cuenta ya es de entrenador: va directo a su panel (queda pendiente hasta aprobarse).
        router.replace('/trainer');
        router.refresh();
      } else toast.error(res.error === 'ALREADY_CLIENT' ? TC.alreadyClient : TC.error);
    });
  }

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{TC.nameLabel}</span>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{TC.credentialLabel}</span>
        <Input
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder={TC.credentialPlaceholder}
          maxLength={200}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{TC.bioLabel}</span>
        <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} rows={3} />
      </label>
      <Button onClick={submit} disabled={pending || !valid}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {TC.apply}
      </Button>
    </div>
  );
}

/** El código que el entrenador le pasa a sus clientes. */
export function InviteCodeCard({ code }: { code: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(TC.copied);
    } catch {
      toast.error(TC.error);
    }
  }

  function renew() {
    if (!confirm(TC.renewConfirm)) return;
    start(async () => {
      const res = await renewInviteCode();
      if (res.ok) router.refresh();
      else toast.error(TC.error);
    });
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-medium">{TC.inviteTitle}</p>
      <p className="text-xs text-muted-foreground">{TC.inviteHelp}</p>
      <div className="flex items-center gap-2">
        <span className="flex-1 rounded-lg bg-secondary px-3 py-2 text-center font-mono text-lg font-semibold tracking-[0.3em]">
          {code}
        </span>
        <Button variant="outline" size="icon" onClick={copy} aria-label={TC.copy}>
          <Copy className="size-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={renew} disabled={pending} aria-label={TC.renew}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>
    </div>
  );
}
