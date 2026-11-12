'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STAFF_ROLES, type StaffRole } from '@/features/gym/staff';
import { addStaffAction, removeStaffAction, type StaffActionError } from './staff-actions';

const ERRORS: Record<StaffActionError, string> = {
  INVALID: 'Revisá los datos.',
  NOT_OWNER: 'No se pudo.',
  EMAIL: 'Ese mail no es válido.',
  ROLE: 'Elegí un rol.',
  TOO_MANY: 'Llegaste al máximo de personas del equipo.',
  IS_OWNER: 'Ese mail es el tuyo: ya tenés acceso a todo.',
  NOT_CONFIGURED: 'No se pudo crear la cuenta ahora. Escribinos a gimnasios@forzaai.app.',
  CREATE_FAILED: 'No se pudo crear la cuenta. Probá de nuevo.',
  NOT_FOUND: 'Esa persona ya no está.',
};

export interface StaffView {
  id: string;
  email: string;
  role: StaffRole;
}

/** El equipo del gimnasio: quién tiene acceso al panel y con qué permisos. */
export function StaffManager({ staff }: { staff: StaffView[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('RECEPTION');

  function add() {
    start(async () => {
      const res = await addStaffAction({ email, role });
      if ('ok' in res) {
        toast.success(res.emailSent ? 'Listo: le mandamos un mail para que entre.' : 'Listo. No pudimos mandarle el mail: avisale que entre a panel.forzaai.app con ese mail.');
        setEmail('');
        router.refresh();
      } else toast.error(ERRORS[res.error]);
    });
  }

  function remove(s: StaffView) {
    if (!window.confirm(`¿Sacarle el acceso a ${s.email}?`)) return;
    start(async () => {
      const res = await removeStaffAction({ id: s.id });
      if ('ok' in res) {
        toast.success('Acceso quitado.');
        router.refresh();
      } else toast.error(ERRORS[res.error]);
    });
  }

  const label = (r: StaffRole) => STAFF_ROLES.find((x) => x.key === r)?.label ?? r;

  return (
    <div className="space-y-4">
      {staff.length > 0 ? (
        <ul className="divide-y rounded-xl border">
          {staff.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium">{s.email}</span>
                <span className="block text-xs text-muted-foreground">{label(s.role)}</span>
              </span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(s)} aria-label={`Sacar a ${s.email}`}>
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border p-3 text-sm text-muted-foreground">Todavía no le diste acceso a nadie. Solo vos entrás al panel.</p>
      )}

      <div className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">Darle acceso a alguien</h2>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Mail de la persona</span>
          <Input value={email} type="email" onChange={(e) => setEmail(e.target.value)} placeholder="recepcion@migimnasio.com" />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">¿Qué puede hacer?</legend>
          {STAFF_ROLES.map((r) => (
            <label key={r.key} className="flex items-start gap-2 text-sm">
              <input type="radio" name="role" className="mt-1" checked={role === r.key} onChange={() => setRole(r.key)} />
              <span>
                <span className="block font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.description}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button disabled={pending || !email.trim()} onClick={add}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Dar acceso
        </Button>
        <p className="text-xs text-muted-foreground">Le llega un mail para entrar (si no tiene cuenta, la crea y elige su contraseña). No ve la marca, el equipo ni lo que pagás a Forza AI.</p>
      </div>
    </div>
  );
}
