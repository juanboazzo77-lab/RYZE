'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApproveGym, adminRegenerateCode, adminRejectGym, adminSetLimit, adminSetSuspended } from './actions';
import { GYM } from './copy';
import { formatGymCode, usedPercent } from './logic';
import type { GymRow } from '@/server/gyms';

const STATUS_LABEL = { PENDING: GYM.pending, ACTIVE: GYM.active, SUSPENDED: GYM.suspended, REJECTED: GYM.rejected } as const;

/** Un gimnasio en el panel de administrador: datos de contacto, cupo, código y botones. */
export function GymAdminCard({ g }: { g: GymRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [limitText, setLimitText] = useState(String(g.memberLimit > 0 ? g.memberLimit : (g.memberEstimate ?? 100)));

  const done = (ok: boolean | undefined, msg: string = GYM.saved) => {
    if (ok) {
      toast.success(msg);
      router.refresh();
    } else toast.error(GYM.error);
  };
  const n = Number(limitText);
  const validLimit = Number.isInteger(n) && n >= 1 && n <= 20000;
  const pct = usedPercent(g.activeMembers, g.memberLimit);
  const full = g.status === 'ACTIVE' && g.memberLimit > 0 && g.activeMembers >= g.memberLimit;

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{g.name}</p>
          <p className="text-xs text-muted-foreground">
            {g.city ? `${g.city} · ` : ''}
            {new Date(g.createdAt).toLocaleDateString('es-AR')}
          </p>
        </div>
        <Badge variant={g.status === 'ACTIVE' ? 'success' : g.status === 'PENDING' ? 'secondary' : 'outline'}>
          {STATUS_LABEL[g.status]}
        </Badge>
      </div>

      <div className="space-y-0.5 text-sm">
        <p>
          {g.contactName} ·{' '}
          <a className="underline" href={`mailto:${g.contactEmail}`}>
            {g.contactEmail}
          </a>
        </p>
        {g.contactPhone ? <p className="text-muted-foreground">{g.contactPhone}</p> : null}
        {g.memberEstimate ? <p className="text-muted-foreground">Dice tener unos {g.memberEstimate} socios.</p> : null}
        {g.message ? <p className="text-muted-foreground">“{g.message}”</p> : null}
      </div>

      {g.status === 'ACTIVE' || g.status === 'SUSPENDED' ? (
        <div className="space-y-1 rounded-lg bg-secondary/50 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>
              <span className="text-lg font-semibold tabular-nums">{g.activeMembers}</span> / {g.memberLimit} {GYM.members}
            </span>
            {full ? <Badge variant="warning">{GYM.fullWarning}</Badge> : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {g.trainedThisWeek} {GYM.trainedWeek}
          </p>
          {g.inviteCode ? (
            <p className="pt-1 text-xs text-muted-foreground">
              Código: <span className="select-all font-mono text-sm font-semibold text-foreground">{formatGymCode(g.inviteCode)}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        {g.status !== 'REJECTED' ? (
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">{GYM.limitLabel}</span>
            <Input
              inputMode="numeric"
              value={limitText}
              onChange={(e) => setLimitText(e.target.value)}
              className="h-9 w-28"
            />
          </label>
        ) : null}

        {g.status === 'PENDING' ? (
          <>
            <Button
              size="sm"
              disabled={pending || !validLimit}
              onClick={() =>
                start(async () => {
                  const res = await adminApproveGym({ gymId: g.id, memberLimit: n });
                  done(res.ok, res.data ? `Aprobado. Código: ${formatGymCode(res.data.code)}` : GYM.saved);
                })
              }
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {GYM.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => start(async () => done((await adminRejectGym({ gymId: g.id })).ok))}
            >
              {GYM.reject}
            </Button>
          </>
        ) : null}

        {g.status === 'ACTIVE' || g.status === 'SUSPENDED' ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || !validLimit || n === g.memberLimit}
              onClick={() => start(async () => done((await adminSetLimit({ gymId: g.id, memberLimit: n })).ok))}
            >
              {GYM.saveLimit}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                if (confirm(GYM.newCodeConfirm)) start(async () => done((await adminRegenerateCode({ gymId: g.id })).ok));
              }}
            >
              {GYM.newCode}
            </Button>
            <Button
              size="sm"
              variant={g.status === 'ACTIVE' ? 'ghost' : 'default'}
              disabled={pending}
              onClick={() =>
                start(async () => done((await adminSetSuspended({ gymId: g.id, suspended: g.status === 'ACTIVE' })).ok))
              }
            >
              {g.status === 'ACTIVE' ? GYM.suspend : GYM.reactivate}
            </Button>
          </>
        ) : null}
      </div>
      {g.status === 'ACTIVE' ? (
        <p className="text-xs text-muted-foreground">Con el cupo lleno, el código no acepta socios nuevos.</p>
      ) : null}
    </div>
  );
}
