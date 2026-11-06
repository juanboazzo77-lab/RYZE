'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { joinGym, leaveMyGym, setMyShareActivity } from './actions';
import { fill, GYM } from './copy';

/** Ajustes del socio: ingresar el código de su gimnasio, decidir qué comparte con él, o salir del actual. */
export function MemberGymPanel({ gymName, shareActivity }: { gymName: string | null; shareActivity: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState('');
  const [share, setShare] = useState(shareActivity);
  // Al ingresar el código, el permiso viene tildado (con la explicación a la vista) y se puede destildar.
  const [joinShare, setJoinShare] = useState(true);

  if (gymName) {
    return (
      <div className="space-y-4 rounded-xl border p-4">
        <div className="space-y-1">
          <p className="font-semibold">{fill(GYM.inGymTitle, { name: gymName })}</p>
          <p className="text-sm text-muted-foreground">{GYM.inGymText}</p>
        </div>

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) return;
    start(async () => {
      const res = await joinGym({ code, share: joinShare });
      if (res.ok && res.data) {
        toast.success(fill(GYM.joined, { name: res.data.gymName }));
        setCode('');
        router.refresh();
      } else {
        toast.error(res.reason === 'FULL' ? GYM.errFull : res.reason === 'ALREADY_MEMBER' ? GYM.errAlready : GYM.errInvalidCode);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border p-4">
      <p className="text-sm text-muted-foreground">{GYM.memberIntro}</p>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">{GYM.codeLabel}</span>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={GYM.codePlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={12}
          className="font-mono uppercase tracking-wider"
        />
      </label>
      <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-secondary/50 p-3">
        <input type="checkbox" checked={joinShare} onChange={(e) => setJoinShare(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">{GYM.joinShareLabel}</span>
          <span className="block text-xs text-muted-foreground">{GYM.joinShareHelp}</span>
        </span>
      </label>
      <Button type="submit" disabled={pending || code.trim().length < 4} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? GYM.joining : GYM.join}
      </Button>
    </form>
  );
}
