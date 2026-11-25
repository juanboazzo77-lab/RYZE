'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bug, ImagePlus, Lightbulb, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MAX_NOTE_LENGTH, MAX_PHOTO_BYTES, type NoteKind } from '@/server/admin-notes-shared';
import { saveNote } from './note-actions';

/** Achica la captura en el teléfono (hasta 1600 px y por debajo del límite) antes de mandarla. */
async function shrinkImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  let side = 1600;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob && blob.size <= MAX_PHOTO_BYTES) return new File([blob], 'captura.jpg', { type: 'image/jpeg' });
    side = Math.round(side * 0.75);
  }
  throw new Error('IMAGE_TOO_BIG');
}

export function NoteForm() {
  const router = useRouter();
  const [kind, setKind] = useState<NoteKind>('BUG');
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setPhoto(await shrinkImage(file));
    } catch {
      toast.error('No se pudo usar esa imagen. Probá con una captura de pantalla.');
    }
  }

  function submit() {
    start(async () => {
      const form = new FormData();
      form.set('kind', kind);
      form.set('text', text);
      if (photo) form.set('photo', photo);
      try {
        const res = await saveNote(form);
        if ('error' in res) {
          toast.error('Escribí qué pasa (al menos unas palabras).');
          return;
        }
        if (res.photoFailed) toast.warning('La nota se guardó, pero la captura no se pudo subir.');
        else toast.success('Anotado en el buzón.');
        setText('');
        setPhoto(null);
        if (fileRef.current) fileRef.current.value = '';
        router.refresh();
      } catch {
        toast.error('No se pudo guardar. Revisá la conexión y probá de nuevo.');
      }
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-3">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { value: 'BUG', label: 'Error', icon: Bug },
            { value: 'IDEA', label: 'Mejora', icon: Lightbulb },
          ] as const
        ).map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={kind === o.value}
            onClick={() => setKind(o.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm font-medium',
              kind === o.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground',
            )}
          >
            <o.icon className="size-4" />
            {o.label}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={5}
        aria-label="Qué pasa o qué querés mejorar"
        placeholder={kind === 'BUG' ? 'Qué pasó, en qué pantalla y a quién le pasó…' : 'Qué te gustaría cambiar o agregar…'}
        className="w-full rounded-lg border bg-background p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
      />

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {photo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium">
            Captura lista ({Math.round(photo.size / 1024)} KB)
            <button type="button" aria-label="Quitar captura" onClick={() => setPhoto(null)}>
              <X className="size-3.5" />
            </button>
          </span>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" />
            Adjuntar captura
          </Button>
        )}
        <Button type="button" onClick={submit} disabled={pending || text.trim().length < 3}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Guardar
        </Button>
      </div>
    </div>
  );
}
