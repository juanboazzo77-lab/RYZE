'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminApproveInvites, adminMarkInvitesPaid, adminRejectInvites } from './invite-actions';
import type { PendingGroup } from '@/server/invites';

/**
 * Altas pendientes de un gimnasio. El comprobante de pago te llega por mail o WhatsApp: cuando ves que pagaron,
 * marcás "Pago recibido" y recién ahí se pueden aprobar (sale el mail de invitación a cada cliente).
 */
export function PendingInvites({ group }: { group: PendingGroup }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const allIds = group.invites.map((i) => i.id);
  const unpaidIds = group.invites.filter((i) => !i.paid).map((i) => i.id);
  const paidIds = group.invites.filter((i) => i.paid).map((i) => i.id);
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Sin elegir nada, cada botón actúa sobre lo que corresponde: marcar pago sobre los que faltan, aprobar sobre los pagados.
  const pickedList = [...picked];
  const toMark = pickedList.length > 0 ? pickedList.filter((id) => unpaidIds.includes(id)) : unpaidIds;
  const toApprove = pickedList.length > 0 ? pickedList.filter((id) => paidIds.includes(id)) : paidIds;
  const toUnmark = pickedList.filter((id) => paidIds.includes(id));
  const toReject = pickedList.length > 0 ? pickedList : allIds;

  function markPaid(list: string[], paid: boolean) {
    start(async () => {
      const res = await adminMarkInvitesPaid({ ids: list, paid });
      if (res.ok) {
        toast.success(paid ? `${res.count} marcados como pagados.` : 'Pago desmarcado.');
        setPicked(new Set());
        router.refresh();
      } else toast.error('No se pudo actualizar.');
    });
  }

  function approve(list: string[]) {
    start(async () => {
      const res = await adminApproveInvites({ ids: list });
      if (res.ok && res.result) {
        const r = res.result;
        toast.success(`${r.approved} aprobados · ${r.emailsSent} mails enviados`);
        if (r.emailsFailed > 0) toast.warning(`${r.emailsFailed} mails no salieron: reenvialos desde "Mails sin enviar".`);
        if (r.unpaid > 0) toast.warning(`${r.unpaid} sin pago confirmado: no se aprobaron.`);
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
        <Badge variant={group.room >= paidIds.length ? 'success' : 'warning'}>
          {group.room >= paidIds.length ? `Hay lugar para los ${paidIds.length} pagados` : `Hay lugar para ${group.room}`}
        </Badge>
      </div>

      <ul className="divide-y rounded-lg border">
        {group.invites.map((i) => (
          <li key={i.id} className="px-3 py-2 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={picked.has(i.id)} onChange={() => toggle(i.id)} className="size-4 accent-[var(--primary)]" />
              <span className="min-w-0 flex-1 truncate">{i.email}</span>
              {i.paid ? <Badge variant="success">Pago recibido</Badge> : <Badge variant="secondary">Falta el pago</Badge>}
              <span className="shrink-0 text-xs text-muted-foreground">{new Date(i.requestedAt).toLocaleDateString('es-AR')}</span>
            </label>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        El gimnasio te manda el comprobante por mail o WhatsApp. Cuando veas que pagó, marcá <strong>Pago recibido</strong> y después <strong>Aprobar</strong>.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={pending || toMark.length === 0} onClick={() => markPaid(toMark, true)}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Pago recibido ({toMark.length})
        </Button>
        <Button size="sm" disabled={pending || toApprove.length === 0} onClick={() => approve(toApprove)}>
          Aprobar ({toApprove.length})
        </Button>
        <Button size="sm" variant="ghost" disabled={pending || toUnmark.length === 0} onClick={() => markPaid(toUnmark, false)}>
          Quitar pago
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => reject(toReject)}>
          {pickedList.length > 0 ? `Rechazar ${pickedList.length}` : 'Rechazar todos'}
        </Button>
      </div>
    </div>
  );
}
