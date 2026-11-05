'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { adminSaveGymProfile } from './actions';
import { EQUIPMENT_GROUPS, SPECIALTIES, type GymProfile } from './catalog';

/**
 * Máquinas y especialidad de un gimnasio. Es lo que la IA usa para armar las rutinas de sus socios: sólo con
 * el equipamiento marcado y con el enfoque elegido. Desplegable para no alargar la tarjeta.
 */
export function GymProfileEditor({ gymId, specialty, profile }: { gymId: string; specialty: string | null; profile: GymProfile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sp, setSp] = useState(specialty ?? '');
  const [detail, setDetail] = useState(profile.specialtyDetail);
  const [notes, setNotes] = useState(profile.notes);
  const [items, setItems] = useState<Set<string>>(new Set(profile.items));

  const toggle = (key: string) =>
    setItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const total = items.size;

  return (
    <details className="rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium">
        <span>Máquinas y especialidad</span>
        <span className="text-xs font-normal text-muted-foreground">
          {specialty ? (SPECIALTIES.find((s) => s.key === specialty)?.label ?? specialty) : 'Sin especialidad'} · {profile.items.length} cargadas
        </span>
      </summary>
      <div className="space-y-4 border-t p-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Especialidad del gimnasio</span>
          <NativeSelect value={sp} onChange={(e) => setSp(e.target.value)}>
            <option value="">Sin especificar</option>
            {SPECIALTIES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {sp === 'DEPORTES' ? (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">¿Qué deportes? (por ejemplo rugby, hockey, fútbol)</span>
            <Input value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={200} />
          </label>
        ) : null}

        {EQUIPMENT_GROUPS.map((g) => (
          <fieldset key={g.key} className="space-y-1.5">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</legend>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {g.items.map((i) => (
                <label key={i.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-secondary/50">
                  <input type="checkbox" checked={items.has(i.key)} onChange={() => toggle(i.key)} className="size-4 accent-[var(--primary)]" />
                  <span>{i.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Aclaraciones (por ejemplo: mancuernas hasta 40 kg, 4 prensas)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={600}
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>

        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await adminSaveGymProfile({
                gymId,
                specialty: sp || null,
                specialtyDetail: sp === 'DEPORTES' ? detail : '',
                items: [...items],
                notes,
              });
              if (res.ok) {
                toast.success('Equipamiento guardado.');
                router.refresh();
              } else toast.error('No se pudo guardar.');
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar ({total} {total === 1 ? 'elemento' : 'elementos'})
        </Button>
      </div>
    </details>
  );
}
