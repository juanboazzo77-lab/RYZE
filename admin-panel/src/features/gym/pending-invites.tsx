'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminApproveInvites, adminRejectInvites } from './invite-actions';
import type { PendingGroup } from '@/server/invites';

/** Altas pendientes de un gimnasio: se eligen y se aprueban (sale el mail al cliente) o se rechazan. */
export function PendingInvites({ group }: { group: PendingGroup }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const all = group.invites.map((i) => i.id);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const chosen = picked.size > 0 ? [...picked] : all;

  function approve(list: string[]) {
    start(async () => {
      const res = await adminApproveInvites({ ids: list });
      if (res.ok && res.result) {
        const r = res.result;
        toast.success(`${r.approved} aprobados · ${r.emailsSent} mails enviados`);
        if (r.emailsFailed > 0) toast.warning(`${r.emailsFailed} mails no salieron: reenvialos desde "Mails sin enviar".`);
        if (r.overCapacity > 0) toast.warning(`${r.overCapacity} no entran en el cupo: subí el cupo del gimnasio y aprobalos de nuevo.`);
        setPicked(new Set());
        router.refresh();
      } else toast.error('No se pudo aprobar.');
    });
  }

  function reject(list: string[]) {
    if (!confirm(`¿Rechazar ${list.length} ${list.length === 1 ? 'pedido' : 'pedidos'}?`)) return;
    start(async () => {
      const res = await adminRejectInvites({ ids: list });
      if (res.ok) {
        toast.success('Rechazados.');
        setPicked(new Set());
        router.refresh();
      } else toast.error('No se pudo rechazar.');
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{group.gymName}</p>
          <p className="text-xs text-muted-foreground">
            {group.activeMembers} socios + {group.approvedWaiting} invitados sin entrar, de un cupo de {group.memberLimit}
          </p>
        </div>
        <Badge variant={group.room >= group.invites.length ? 'success' : 'warning'}>
          {group.room >= group.invites.length ? `Entran los ${group.invites.length}` : `Hay lugar para ${group.room}`}
        </Badge>
      </div>

      <ul className="divide-y rounded-lg border">
        {group.invites.map((i) => (
          <li key={i.id} className="px-3 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} className="size-4 accent-[var(--primary)]" />
              <span className="min-w-0 flex-1 truncate">{i.email}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(i.requestedAt).toLocaleDateString('es-AR')}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => approve(chosen)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {picked.size > 0 ? `Aprobar ${picked.size} elegidos` : `Aprobar los ${all.length}`}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(chosen)}>
          {picked.size > 0 ? `Rechazar ${picked.size} elegidos` : 'Rechazar todos'}
        </Button>
      </div>
    </div>
  );
}
