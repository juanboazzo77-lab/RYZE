'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addGymClients } from './client-actions';
import { parseClientLines } from '@/features/gym/fees';
import { shrinkPhoto } from './sheet-photo';

/**
 * Cargar clientes: se pega una lista (una por línea) o se sube la foto de la hoja anotada a mano, que se lee con IA y se
 * suma al cuadro de texto para revisarla antes de cargar. Sólo el nombre es obligatorio.
 */
export function AddClientsForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const parsed = parseClientLines(text);

  /** Lee la(s) foto(s) de la hoja y suma lo que encuentra al cuadro de texto, para que se revise antes de cargar. */
  async function readPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setReading(true);
    let found = 0;
    try {
      for (const file of Array.from(files).slice(0, 5)) {
        let blob: Blob;
        try {
          blob = await shrinkPhoto(file);
        } catch {
          toast.error('No se pudo abrir esa foto. Probá sacarla de nuevo.');
          continue;
        }
        const body = new FormData();
        body.append('file', blob, 'hoja.jpg');
        const res = await fetch('/gym/clientes/foto', { method: 'POST', body }).catch(() => null);
        const data = (await res?.json().catch(() => null)) as { lines?: string[]; error?: string } | null;
        if (res?.ok && data?.lines) {
          const lines = data.lines;
          found += lines.length;
          setText((t) => (t.trim() ? `${t.trimEnd()}\n` : '') + lines.join('\n'));
        } else if (data?.error === 'NOT_CONFIGURED') {
          toast.error('Esta función todavía no está activada. Escribinos a gimnasios@forzaai.app.');
          break;
        } else if (data?.error === 'TOO_MANY') {
          toast.error('Subiste muchas fotos seguidas. Probá de nuevo en un rato.');
          break;
        } else if (data?.error === 'UNREADABLE') {
          toast.warning('No pude leer clientes en esa foto. Sacala de frente, con buena luz y con la hoja entera.');
        } else {
          toast.error('No se pudo leer la foto. Probá de nuevo.');
        }
      }
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
    if (found > 0) toast.success(`${found} ${found === 1 ? 'cliente leído' : 'clientes leídos'}. Revisá la lista y tocá Cargar.`);
  }

  function submit() {
    start(async () => {
      const res = await addGymClients({ text });
      if (res.ok && res.data) {
        const { added, skipped, invalid, unknownPlans } = res.data;
        toast.success(added > 0 ? `${added} ${added === 1 ? 'cliente cargado' : 'clientes cargados'}.` : 'No había clientes nuevos.');
        if (skipped > 0) toast.message(`${skipped} ya estaban cargados por su mail.`);
        if (unknownPlans.length > 0) toast.warning(`No existe el plan ${unknownPlans.map((p) => `"${p}"`).join(', ')}: esos clientes quedaron sin plan. Creá el plan en Planes del gimnasio y asignaselo.`);
        if (invalid.length > 0) toast.warning(`No se entendieron ${invalid.length}: ${invalid[0]?.slice(0, 40)}…`);
        if (added > 0) setText('');
        router.refresh();
      } else if (res.error === 'TOO_MANY') toast.error('Son demasiados juntos: cargalos de a 500.');
      else toast.error('No se pudo cargar. Probá de nuevo.');
    });
  }

  return (
    <details open={defaultOpen} className="rounded-xl border">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold">+ Cargar clientes</summary>
      <div className="space-y-3 border-t p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void readPhotos(e.target.files)} />
          <Button type="button" variant="outline" disabled={reading || pending} onClick={() => fileRef.current?.click()}>
            {reading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {reading ? 'Leyendo la hoja…' : 'Subir foto de la hoja'}
          </Button>
          <Link href="/gym/clientes/plantilla" className="inline-flex h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground underline hover:text-foreground">
            <FileText className="size-4" />
            Plantilla para anotar en papel
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Anotá a tus clientes a mano en la plantilla, sacale una foto y subila: la leemos y armamos la lista para que la revises. También podés escribirlos o pegarlos acá abajo.
        </p>
        <label className="block space-y-1">
          <span className="block text-xs text-muted-foreground">
            Un cliente por línea: <span className="font-mono">Nombre, mail, teléfono, Plan: nombre del plan, cuota, vencimiento</span>. Solo el nombre es obligatorio; lo demás puede faltar. El vencimiento es el día que le toca pagar (por ejemplo 20/11/2026).
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            disabled={pending}
            placeholder={'Ana Pérez, ana@gmail.com, 11 5555-1234, Plan: Pase libre, 25000, 20/11/2026\nLuis Gómez, luis@gmail.com\nMarta Ruiz'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {parsed.valid.length} {parsed.valid.length === 1 ? 'cliente' : 'clientes'} para cargar{parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} sin entender` : ''}
          </span>
          <Button disabled={pending || parsed.valid.length === 0} onClick={submit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Cargar
          </Button>
        </div>
      </div>
    </details>
  );
}
