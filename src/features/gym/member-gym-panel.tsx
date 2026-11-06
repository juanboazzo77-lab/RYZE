'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { leaveMyGym, setMyShareActivity } from './actions';
import { fill, GYM } from './copy';

/** Ajustes del socio: ingresar el código de su gimnasio, decidir qué comparte con él, o salir del actual. */
export function MemberGymPanel({ gymName, shareActivity }: { gymName: string | null; shareActivity: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [share, setShare] = useState(shareActivity);

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

  // Sin gimnasio: ya no se ingresa un código. El gimnasio carga el mail, se aprueba y llega una invitación por mail.
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <p className="font-semibold">{GYM.noGymTitle}</p>
      <p className="text-sm text-muted-foreground">{GYM.noGymText}</p>
    </div>
  );
}
