'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { describePlan, type ClassesMode } from '@/features/gym/plans';
import { formatMoney } from '@/features/gym/money';
import { removePlanAction, savePlanAction, type PlanActionError } from './plan-actions';

export interface PlanView {
  id: string;
  name: string;
  description: string;
  price: number | null;
  classesMode: ClassesMode;
  classNames: string[];
  weeklyLimit: number | null;
  clients: number;
}

const ERRORS: Record<PlanActionError, string> = {
  INVALID: 'Revisá los datos del plan.',
  NOT_OWNER: 'No se pudo guardar.',
  NOT_FOUND: 'Ese plan ya no existe.',
  NAME: 'Poné un nombre para el plan (al menos 2 letras).',
  PRICE: 'El precio no es válido.',
  CLASSES: 'Elegí al menos un tipo de clase, o marcá "Todas las clases".',
  LIMIT: 'Las reservas por semana tienen que ser un número entre 1 y 21 (o dejalo vacío para que no haya límite).',
  TOO_MANY: 'Llegaste al máximo de planes.',
  DUPLICATE: 'Ya tenés un plan con ese nombre.',
};

interface Draft {
  id: string | null;
  name: string;
  description: string;
  price: string;
  classesMode: ClassesMode;
  classNames: string[];
  weeklyLimit: string;
}

const emptyDraft: Draft = { id: null, name: '', description: '', price: '', classesMode: 'ALL', classNames: [], weeklyLimit: '' };

const draftOf = (p: PlanView): Draft => ({
  id: p.id,
  name: p.name,
  description: p.description,
  price: p.price === null ? '' : String(p.price),
  classesMode: p.classesMode,
  classNames: p.classNames,
  weeklyLimit: p.weeklyLimit === null ? '' : String(p.weeklyLimit),
});

/** Los planes de pago del gimnasio: ver, crear, cambiar y borrar. Cada plan define a qué clases se puede anotar el cliente. */
export function PlanEditor({ plans, classTypes, currency, suggestions }: { plans: PlanView[]; classTypes: string[]; currency: 'ARS' | 'USD'; suggestions: Array<{ name: string; description: string; classesMode: ClassesMode; weeklyLimit: number | null }> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  function save() {
    if (!draft) return;
    start(async () => {
      const res = await savePlanAction({ ...draft });
      if (res.ok) {
        toast.success('Plan guardado.');
        setDraft(null);
        router.refresh();
      } else toast.error(ERRORS[res.error ?? 'INVALID']);
    });
  }

  function remove(p: PlanView) {
    const msg = p.clients > 0 ? `¿Borrar "${p.name}"? Sus ${p.clients} ${p.clients === 1 ? 'cliente queda' : 'clientes quedan'} sin plan (sin restricciones).` : `¿Borrar "${p.name}"?`;
    if (!window.confirm(msg)) return;
    start(async () => {
      const res = await removePlanAction({ id: p.id });
      if (res.ok) {
        toast.success('Plan borrado.');
        router.refresh();
      } else toast.error(ERRORS[res.error ?? 'INVALID']);
    });
  }

  const toggleClass = (name: string) =>
    setDraft((d) => (d ? { ...d, classNames: d.classNames.includes(name) ? d.classNames.filter((n) => n !== name) : [...d.classNames, name] } : d));

  return (
    <div className="space-y-4">
      {plans.length === 0 && !draft ? (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">
            Todavía no cargaste planes. Si tu gimnasio tiene distintos planes de pago (por ejemplo uno para todas las clases y otro solo para musculación), cargalos acá y decidí a qué clases puede anotarse cada uno. Si no los cargás, todos tus clientes pueden reservar cualquier clase.
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button key={s.name} variant="outline" size="sm" onClick={() => setDraft({ ...emptyDraft, name: s.name, description: s.description, classesMode: s.classesMode, weeklyLimit: s.weeklyLimit === null ? '' : String(s.weeklyLimit) })}>
                + {s.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {plans.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const d = describePlan(p);
            return (
              <li key={p.id} className="space-y-2 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.name}</p>
                    {p.price !== null ? <p className="text-sm text-muted-foreground">{formatMoney(p.price, currency)} por mes</p> : null}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3.5" aria-hidden="true" />
                    {p.clients}
                  </span>
                </div>
                {p.description ? <p className="text-sm text-muted-foreground">{p.description}</p> : null}
                <ul className="space-y-0.5 text-sm">
                  <li>{d.classes}</li>
                  <li>{d.weekly}</li>
                </ul>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => setDraft(draftOf(p))}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(p)} aria-label={`Borrar ${p.name}`}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!draft && plans.length > 0 ? (
        <Button variant="outline" onClick={() => setDraft({ ...emptyDraft })}>
          <Plus className="size-4" />
          Nuevo plan
        </Button>
      ) : null}

      {draft ? (
        <div className="space-y-4 rounded-xl border p-4">
          <h2 className="text-base font-semibold">{draft.id ? 'Editar plan' : 'Nuevo plan'}</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Nombre del plan</span>
              <Input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Pase libre" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Precio por mes (opcional)</span>
              <Input value={draft.price} inputMode="decimal" onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="25000" />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Descripción (opcional)</span>
            <Input value={draft.description} maxLength={200} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Musculación y todas las clases" />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">¿A qué clases puede anotarse?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={draft.classesMode === 'ALL'} onChange={() => setDraft({ ...draft, classesMode: 'ALL' })} />
              A todas las clases
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="mode" checked={draft.classesMode === 'SELECTED'} onChange={() => setDraft({ ...draft, classesMode: 'SELECTED' })} />
              Solo a algunos tipos de clase
            </label>
            {draft.classesMode === 'SELECTED' ? (
              classTypes.length === 0 ? (
                <p className="rounded-lg border p-3 text-xs text-muted-foreground">Todavía no cargaste clases. Primero armalas en la sección Clases y después elegís cuáles incluye este plan.</p>
              ) : (
                <div className="flex flex-wrap gap-2 pl-6">
                  {classTypes.map((t) => (
                    <label key={t} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${draft.classNames.includes(t) ? 'border-primary bg-primary/10 font-medium' : ''}`}>
                      <input type="checkbox" className="sr-only" checked={draft.classNames.includes(t)} onChange={() => toggleClass(t)} />
                      {t}
                    </label>
                  ))}
                </div>
              )
            ) : null}
          </fieldset>

          <label className="block space-y-1 sm:max-w-xs">
            <span className="text-sm font-medium">Reservas de clase por semana</span>
            <Input value={draft.weeklyLimit} inputMode="numeric" onChange={(e) => setDraft({ ...draft, weeklyLimit: e.target.value.replace(/[^\d]/g, '') })} placeholder="Sin límite" />
            <span className="block text-xs text-muted-foreground">Dejalo vacío si no hay límite. La semana va de lunes a domingo.</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={save}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar plan
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setDraft(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
