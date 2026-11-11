'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { editGymClient, markGymClientPaid, removeGymClient, setGymClientPlan } from './client-actions';
import { FEE_LABEL } from '@/features/gym/fees';
import type { ClientRow, ForzaState } from '@/server/gym-clients';
import { reminderMessage, whatsappLink } from './whatsapp';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function dueText(c: ClientRow): string {
  if (c.paidUntil === null || c.daysLeft === null) return 'Sin fecha de vencimiento';
  if (c.daysLeft > 0) return `Vence el ${fmtDate(c.paidUntil)} (en ${c.daysLeft} ${c.daysLeft === 1 ? 'día' : 'días'})`;
  if (c.daysLeft === 0) return 'Vence hoy';
  return `Venció el ${fmtDate(c.paidUntil)} (hace ${-c.daysLeft} ${-c.daysLeft === 1 ? 'día' : 'días'})`;
}

const STATUS_VARIANT = { NEW: 'secondary', OK: 'success', SOON: 'secondary', DUE_TODAY: 'warning', OVERDUE: 'warning', LAPSED: 'warning' } as const;

const FORZA_LABEL: Record<ForzaState, string> = {
  NONE: '',
  NO_EMAIL: '',
  MEMBER: 'Tiene Forza AI',
  LAPSED: 'Forza AI pausado por cuota vencida',
};

/** Un cliente del gimnasio: su cuota, el botón de "Pagó" y las opciones. */
export function ClientRow({ c, gymName, plans = [] }: { c: ClientRow; gymName: string; plans?: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState('1');
  const [until, setUntil] = useState(c.paidUntil ?? '');
  const [fee, setFee] = useState(c.feeAmount !== null ? String(c.feeAmount) : '');
  const [phone, setPhone] = useState(c.phone ?? '');
  const [email, setEmail] = useState(c.email ?? '');
  const [planId, setPlanId] = useState(c.planId ?? '');

  const done = (ok: boolean | undefined, msg: string) => {
    if (ok) {
      toast.success(msg);
      router.refresh();
    } else toast.error('No se pudo completar. Probá de nuevo.');
  };

  function paid(m: number) {
    start(async () => {
      const res = await markGymClientPaid({ id: c.id, months: m });
      done(res.ok, res.data ? `Listo: ahora paga hasta el ${fmtDate(res.data.paidUntil)}.` : '');
    });
  }

  function save() {
    start(async () => {
      const n = Number(fee.replace(',', '.'));
      const res = await editGymClient({
        id: c.id,
        paidUntil: until || null,
        feeAmount: fee.trim() === '' ? null : Number.isFinite(n) ? n : null,
        phone: phone.trim() || null,
        email: email.trim() || null,
      });
      done(res.ok, 'Guardado.');
    });
  }

  function changePlan(next: string) {
    setPlanId(next);
    start(async () => {
      const res = await setGymClientPlan({ id: c.id, planId: next || null });
      if (res.ok) {
        toast.success(next ? 'Plan asignado.' : 'Plan sacado.');
        router.refresh();
      } else {
        setPlanId(c.planId ?? '');
        toast.error('No se pudo cambiar el plan. Probá de nuevo.');
      }
    });
  }

  const urgent = c.status === 'DUE_TODAY' || c.status === 'OVERDUE' || c.status === 'LAPSED';
  // Aviso por WhatsApp: solo si le toca pagar (hoy o atrasado) y hay un teléfono que sirve.
  const wa = urgent ? whatsappLink(c.phone, reminderMessage({ name: c.name, gymName, daysLeft: c.daysLeft })) : null;

  return (
    <li className={`space-y-2 px-3 py-3 ${urgent ? 'bg-warning/5' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{c.name}</p>
          <p className="truncate text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(' · ') || 'Sin mail ni teléfono'}</p>
          <p className="text-xs text-muted-foreground">
            {dueText(c)}
            {c.feeAmount !== null ? ` · cuota $${c.feeAmount.toLocaleString('es-AR')}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge variant={STATUS_VARIANT[c.status]}>{FEE_LABEL[c.status]}</Badge>
          <Button size="sm" disabled={pending} onClick={() => paid(1)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Pagó
          </Button>
        </div>
      </div>

      {plans.length > 0 ? (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Plan
          <select
            value={planId}
            disabled={pending}
            onChange={(e) => changePlan(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm text-foreground sm:max-w-xs"
            aria-label={`Plan de ${c.name}`}
          >
            <option value="">Sin plan asignado</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{FORZA_LABEL[c.forza]}</span>
        <div className="flex flex-wrap gap-1">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Avisar por WhatsApp
            </a>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Cerrar' : 'Más'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 rounded-lg border bg-background p-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Pagó varios meses juntos</span>
              <select value={months} onChange={(e) => setMonths(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                {[1, 2, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} {m === 1 ? 'mes' : 'meses'}
                  </option>
                ))}
              </select>
            </label>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => paid(Number(months))}>
              Registrar pago
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Vence el día</span>
              <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Cuota por mes ($)</span>
              <Input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} className="h-9" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Mail</span>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Teléfono</span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={save}>
              Guardar cambios
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Sacar a ${c.name} de tu lista?`)) return;
                start(async () => {
                  const res = await removeGymClient({ id: c.id });
                  done(res.ok, 'Cliente quitado.');
                });
              }}
            >
              Quitar de la lista
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
