'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { joinGym, leaveMyGym } from './actions';
import { fill, GYM } from './copy';

/** Ajustes del socio: ingresar el código de su gimnasio o salir del actual. */
export function MemberGymPanel({ gymName }: { gymName: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [code, setCode] = useState('');

  if (gymName) {
    return (
      <div className="space-y-3 rounded-xl border p-4">
        <p className="font-semibold">{fill(GYM.inGymTitle, { name: gymName })}</p>
        <p className="text-sm text-muted-foreground">{GYM.inGymText}</p>
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
      const res = await joinGym({ code });
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
      <Button type="submit" disabled={pending || code.trim().length < 4} className="w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? GYM.joining : GYM.join}
      </Button>
    </form>
  );
}
