'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inviteMembers, uploadPaymentProof } from './actions';
import { parseEmailList } from './logic';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

function fileProblem(f: File): string | null {
  if (f.size > MAX_BYTES) return 'pesa más de 4 MB';
  if (!ACCEPT.split(',').includes(f.type)) return 'tiene que ser una foto (JPG, PNG) o un PDF';
  return null;
}

/**
 * El dueño pega los mails de sus clientes y adjunta el comprobante de pago de cada uno (puede usar el mismo
 * archivo para varios). Sin comprobante no se puede pedir el alta. Quedan pendientes de aprobación.
 */
export function InviteForm({ disabled, pricePerMemberUsd, paymentInstructions }: { disabled?: boolean; pricePerMemberUsd: number; paymentInstructions: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const parsed = parseEmailList(text);

  const fileOf = (email: string) => files[email] ?? null;
  const missing = parsed.valid.filter((e) => !fileOf(e));
  const problems = parsed.valid.filter((e) => fileOf(e) && fileProblem(fileOf(e)!));
  const total = parsed.valid.length * pricePerMemberUsd;

  function pickOne(email: string, f: File | null) {
    setFiles((prev) => ({ ...prev, [email]: f }));
  }
  function pickAll(f: File | null) {
    setFiles((prev) => {
      const next = { ...prev };
      for (const e of parsed.valid) next[e] = f;
      return next;
    });
  }

  function submit() {
    start(async () => {
      // Cada archivo distinto se sube una sola vez, aunque lo usen varios mails.
      const uploaded = new Map<File, string>();
      const items: Array<{ email: string; proofPath: string }> = [];
      for (const email of parsed.valid) {
        const f = fileOf(email)!;
        let path = uploaded.get(f);
        if (!path) {
          const fd = new FormData();
          fd.set('file', f);
          const up = await uploadPaymentProof(fd);
          if (!up.ok || !up.data) {
            toast.error(
              up.error === 'TOO_BIG' ? 'Un comprobante pesa más de 4 MB.' : up.error === 'BAD_TYPE' ? 'Los comprobantes tienen que ser fotos o PDF.' : 'No se pudo subir un comprobante. Probá de nuevo.',
            );
            return;
          }
          path = up.data.path;
          uploaded.set(f, path);
        }
        items.push({ email, proofPath: path });
      }
      const res = await inviteMembers({ items });
      if (res.ok && res.data) {
        const { added, skipped } = res.data;
        toast.success(added > 0 ? `${added} ${added === 1 ? 'pedido enviado' : 'pedidos enviados'} para aprobación.` : 'No había nada nuevo para pedir.');
        if (skipped > 0) toast.message(`${skipped} ya estaban pedidos o adentro.`);
        if (added > 0) {
          setText('');
          setFiles({});
        }
        router.refresh();
      } else if (res.error === 'NOT_ACTIVE') toast.error('Tu gimnasio todavía no está aprobado.');
      else if (res.error === 'TOO_MANY') toast.error('Son demasiados mails juntos: cargalos de a 200.');
      else toast.error('No se pudo enviar el pedido. Probá de nuevo.');
    });
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="space-y-1 rounded-lg bg-secondary/50 p-3 text-sm">
        <p className="font-medium">Cómo pagar</p>
        <p className="text-xs text-muted-foreground">
          Cada alta cuesta US$ {pricePerMemberUsd.toLocaleString('es-AR', { maximumFractionDigits: 2 })} por mes. {paymentInstructions}
        </p>
        <p className="text-xs text-muted-foreground">Después del pago, adjuntá el comprobante de cada cliente: sin él no podemos aprobar el alta.</p>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Mails de tus clientes</span>
        <span className="block text-xs text-muted-foreground">Pegá uno por línea, o separados por coma. Hasta 200 juntos.</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          disabled={disabled || pending}
          placeholder={'ana@ejemplo.com\nluis@ejemplo.com'}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </label>

      {parsed.valid.length > 0 ? (
        <div className="space-y-2">
          <label className="flex cursor-pointer flex-wrap items-center gap-2 rounded-lg border border-dashed p-2 text-xs">
            <Paperclip className="size-4 shrink-0" />
            <span className="font-medium">Usar el mismo comprobante para los {parsed.valid.length} mails</span>
            <input
              type="file"
              accept={ACCEPT}
              disabled={disabled || pending}
              onChange={(e) => pickAll(e.target.files?.[0] ?? null)}
              className="min-w-0 flex-1 text-xs"
            />
          </label>

          <ul className="divide-y rounded-lg border">
            {parsed.valid.map((email) => {
              const f = fileOf(email);
              const prob = f ? fileProblem(f) : null;
              return (
                <li key={email} className="space-y-1 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{email}</span>
                    {f && !prob ? <Check className="size-4 shrink-0 text-success" /> : null}
                  </div>
                  <input
                    type="file"
                    accept={ACCEPT}
                    disabled={disabled || pending}
                    onChange={(e) => pickOne(email, e.target.files?.[0] ?? null)}
                    className="w-full text-xs"
                  />
                  {f ? <p className={`text-xs ${prob ? 'text-destructive' : 'text-muted-foreground'}`}>{prob ? `${f.name}: ${prob}` : f.name}</p> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {parsed.valid.length} {parsed.valid.length === 1 ? 'mail' : 'mails'}
          {parsed.valid.length > 0 ? ` · total US$ ${total.toLocaleString('es-AR', { maximumFractionDigits: 2 })} por mes` : ''}
          {missing.length > 0 ? ` · faltan ${missing.length} comprobantes` : ''}
          {parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} sin entender` : ''}
        </span>
        <Button disabled={disabled || pending || parsed.valid.length === 0 || missing.length > 0 || problems.length > 0} onClick={submit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Pedir el alta
        </Button>
      </div>
    </div>
  );
}
