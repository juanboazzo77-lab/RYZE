'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downscaleImage } from '@/lib/image/downscale';

interface PhotoItem {
  id: string;
  dataUrl: string;
}

/**
 * Selector de fotos reutilizable (revisión semanal, onboarding). Las imágenes se
 * reducen en el navegador. El componente sólo devuelve data URLs vía `onChange`;
 * quien lo usa decide qué hacer con ellas (nunca se guardan tal cual).
 */
export function PhotoPicker({
  value,
  onChange,
  max = 4,
  labels,
  large = false,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  labels: { add: string; remove: string; max: string; error: string };
  /** Pantalla completa: una sola foto, grande, con un área grande para tocar. */
  large?: boolean;
}) {
  const [items, setItems] = useState<PhotoItem[]>(() =>
    value.map((dataUrl) => ({ id: crypto.randomUUID(), dataUrl })),
  );
  const [processing, setProcessing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function commit(next: PhotoItem[]) {
    setItems(next);
    onChange(next.map((x) => x.dataUrl));
  }

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = max - items.length;
    if (room <= 0) {
      toast.error(labels.max);
      return;
    }
    setProcessing(true);
    const added: PhotoItem[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        added.push({ id: crypto.randomUUID(), dataUrl: await downscaleImage(file) });
      } catch {
        toast.error(labels.error);
      }
    }
    commit([...items, ...added]);
    setProcessing(false);
    if (fileInput.current) fileInput.current.value = '';
  }

  if (large) {
    const photo = items[0];
    return (
      <div className="flex h-full min-h-0 flex-col">
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => addFiles(e.target.files)} />
        {photo ? (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.dataUrl} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => commit([])}
              aria-label={labels.remove}
              className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
            >
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={processing}
            onClick={() => fileInput.current?.click()}
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-accent/40 text-primary transition-colors active:bg-accent"
          >
            {processing ? <Loader2 className="size-10 animate-spin" /> : <Camera className="size-12" />}
            <span className="text-base font-semibold">{labels.add}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((p) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.dataUrl} alt="" className="size-20 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => commit(items.filter((x) => x.id !== p.id))}
                aria-label={labels.remove}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-destructive text-destructive-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />
      {items.length < max ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={processing}
          onClick={() => fileInput.current?.click()}
        >
          {processing ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
          {labels.add}
        </Button>
      ) : null}
    </div>
  );
}
