'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { joinGym, leaveMyGym, setMyShareActivity } from './actions';
import { fill, GYM } from './copy';

export interface MemberTrial {
  state: 'ACTIVE' | 'ENDED';
  daysLeft: number;
}

/** Ajustes del socio: ingresar el código de su gimnasio (prueba de 3 días), decidir qué comparte con él, o salir del actual. */
export function MemberGymPanel({
  gymName,
  gymCode,
  shareActivity,
  trial,
  initialCode = '',
}: {
  gymName: string | null;
  gymCode?: string | null;
  shareActivity: boolean;
  trial?: MemberTrial | null;
  initialCode?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [share, setShare] = useState(shareActivity);
  const [code, setCode] = useState(initialCode);
  const [joinShare, setJoinShare] = useState(false);

  function join() {
    start(async () => {
      const res = await joinGym({ code, share: joinShare });
      if (res.ok && res.data) {
        // Si ya había usado su prueba gratis, se conecta pero no recibe otra.
        if (new Date(res.data.trialEndsAt).getTime() > Date.now()) toast.success(fill(GYM.joined, { name: res.data.gymName }));
        else toast.message(fill(GYM.joinedNoTrial, { name: res.data.gymName }));
        router.refresh();
      } else if (res.reason === 'ALREADY_MEMBER') toast.error(GYM.errAlready);
      else toast.error(GYM.errInvalidCode);
    });
  }

  if (gymName) {
    return (
      <div className="space-y-4 rounded-xl border p-4">
        <div className="space-y-1">
          <p className="font-semibold">{fill(GYM.inGymTitle, { name: gymName })}</p>
          <p className="text-sm text-muted-foreground">{trial ? '' : GYM.inGymText}</p>
        </div>

        {trial ? (
          <div className={`space-y-2 rounded-lg border p-3 ${trial.state === 'ENDED' ? 'border-warning/50 bg-warning/10' : 'bg-secondary/50'}`}>
            <p className="text-sm font-semibold">
              {trial.state === 'ACTIVE' ? fill(GYM.trialActiveTitle, { days: trial.daysLeft === 1 ? '1 día' : `${trial.daysLeft} días` }) : GYM.trialEndedTitle}
            </p>
            <p className="text-xs text-muted-foreground">{fill(trial.state === 'ACTIVE' ? GYM.trialActiveText : GYM.trialEndedText, { name: gymName })}</p>
            {gymCode ? (
              <Link href={`/g/${gymCode}`} className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
                {GYM.activatePlan}
              </Link>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3 rounded-lg bg-secondary/50 p-3">
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{GYM.shareTitle}</p>
            <p className="text-xs text-muted-foreground">{GYM.shareText}</p>
          </div>
          <Switch
            checked={share}
            disabled={pending}
            aria-label={GYM.shareTitle}
            onCheckedChange={(v) => {
              setShare(v);
              start(async () => {
                const res = await setMyShareActivity({ share: v });
                if (!res.ok) {
                  setShare(!v);
                  toast.error(GYM.error);
                }
              });
            }}
          />
        </div>

        <Button
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (!confirm(GYM.leaveConfirm)) return;
            start(async () => {
              await leaveMyGym();
              toast.success(GYM.left);
              router.refresh();
            });
          }}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {GYM.leave}
        </Button>
      </div>
    );
  }

  // Sin gimnasio: puede ingresar el código que le pasó su gimnasio (prueba de 3 días).
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <p className="font-semibold">{GYM.noGymTitle}</p>
        <p className="text-sm text-muted-foreground">{GYM.noGymText}</p>
      </div>
      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">{GYM.codeLabel}</span>
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={GYM.codePlaceholder} maxLength={12} autoCapitalize="characters" autoComplete="off" className="font-mono uppercase tracking-wider" />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={joinShare} onChange={(e) => setJoinShare(e.target.checked)} />
        <span>
          {GYM.joinShareLabel}
          <span className="block text-xs text-muted-foreground">{GYM.joinShareHelp}</span>
        </span>
      </label>
      <Button disabled={pending || code.trim().length < 8} onClick={join}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? GYM.joining : GYM.join}
      </Button>
    </div>
  );
}
