'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ImageOff, Loader2, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { deletePhoto, listPhotos, photoStorageAvailable, type ProgressPhoto } from './photo-store';

type Mode = 'slider' | 'side';

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

/** Fecha corta para los selectores, donde la larga se corta en pantallas angostas. */
const fmtShort = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });

/**
 * Galería de fotos de progreso: sólo muestra las que se mandaron en la revisión semanal, con su
 * fecha. No hay forma de subir fotos desde acá.
 */
export function ProgressPhotos() {
  const t = useT();
  const p = t.progress;

  // Se decide en el navegador: en el servidor no existe IndexedDB y el HTML no coincidiría.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [mode, setMode] = useState<Mode>('slider');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [pos, setPos] = useState(50);
  const [viewId, setViewId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setPhotos(await listPhotos());
    } catch {
      setPhotos([]);
    }
  }, []);

  useEffect(() => {
    const ok = photoStorageAvailable();
    setAvailable(ok);
    if (ok) void reload();
    else setPhotos([]);
  }, [reload]);

  const list = useMemo(() => photos ?? [], [photos]);

  // Etiqueta de cada foto: la fecha, con número si ese día hay más de una.
  const labelOf = useMemo(() => {
    const perDay = new Map<string, ProgressPhoto[]>();
    for (const x of list) perDay.set(x.date, [...(perDay.get(x.date) ?? []), x]);
    return (x: ProgressPhoto) => {
      const day = perDay.get(x.date) ?? [];
      return day.length > 1 ? `${fmtShort(x.date)} (${day.indexOf(x) + 1}/${day.length})` : fmtShort(x.date);
    };
  }, [list]);

  // Por defecto se compara la primera foto con la última.
  const before = list.find((x) => x.id === beforeId) ?? list[0] ?? null;
  const after = list.find((x) => x.id === afterId) ?? list[list.length - 1] ?? null;
  const canCompare = list.length >= 2 && before && after && before.id !== after.id;

  // Agrupadas por día, la más nueva arriba.
  const days = useMemo(() => {
    const map = new Map<string, ProgressPhoto[]>();
    for (const x of list) map.set(x.date, [...(map.get(x.date) ?? []), x]);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [list]);

  const viewing = list.find((x) => x.id === viewId) ?? null;

  async function remove(id: string) {
    if (!confirm(p.photosDeleteConfirm)) return;
    try {
      await deletePhoto(id);
      if (beforeId === id) setBeforeId(null);
      if (afterId === id) setAfterId(null);
      if (viewId === id) setViewId(null);
      await reload();
    } catch {
      toast.error(p.photosErr);
    }
  }

  if (available === false) {
    return <p className="text-sm text-muted-foreground">{p.photosUnsupported}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-lg border bg-secondary/40 p-3 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        {p.photosPrivacy}
      </p>

      {photos === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <ImageOff className="size-6" />
          </span>
          <p className="max-w-xs text-sm text-muted-foreground">{p.photosEmptyCheckin}</p>
          <Button asChild className="rounded-full px-6">
            <Link href="/checkin">{t.checkin.title}</Link>
          </Button>
        </div>
      ) : (
        <>
          {canCompare && before && after ? (
            <Card className="rounded-3xl">
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="photo-before">{p.photosBefore}</Label>
                    <NativeSelect
                      id="photo-before"
                      value={before.id}
                      onChange={(e) => setBeforeId(e.target.value)}
                    >
                      {list.map((x) => (
                        <option key={x.id} value={x.id}>
                          {labelOf(x)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="photo-after">{p.photosAfter}</Label>
                    <NativeSelect
                      id="photo-after"
                      value={after.id}
                      onChange={(e) => setAfterId(e.target.value)}
                    >
                      {list.map((x) => (
                        <option key={x.id} value={x.id}>
                          {labelOf(x)}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="flex rounded-lg border bg-secondary p-0.5 text-xs">
                  {(['slider', 'side'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
                        mode === m
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {m === 'slider' ? p.photosSlider : p.photosSideBySide}
                    </button>
                  ))}
                </div>

                {mode === 'slider' ? (
                  <div>
                    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm select-none overflow-hidden rounded-lg bg-black">
                      {/* eslint-disable @next/next/no-img-element */}
                      <img
                        src={after.dataUrl}
                        alt={p.photosAfter}
                        className="absolute inset-0 size-full object-cover"
                        draggable={false}
                      />
                      <img
                        src={before.dataUrl}
                        alt={p.photosBefore}
                        className="absolute inset-0 size-full object-cover"
                        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
                        draggable={false}
                      />
                      {/* eslint-enable @next/next/no-img-element */}
                      <div
                        className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
                        style={{ left: `${pos}%` }}
                      />
                      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {p.photosBefore} · {fmtDate(before.date)}
                      </span>
                      <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {p.photosAfter} · {fmtDate(after.date)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pos}
                      onChange={(e) => setPos(Number(e.target.value))}
                      aria-label={p.photosSlider}
                      className="mx-auto mt-3 block w-full max-w-sm accent-[var(--primary)]"
                    />
                  </div>
                ) : (
                  <div className="mx-auto grid max-w-md grid-cols-2 gap-2">
                    {[
                      { photo: before, label: p.photosBefore },
                      { photo: after, label: p.photosAfter },
                    ].map(({ photo, label }) => (
                      <div key={label} className="space-y-1">
                        <div className="aspect-[3/4] overflow-hidden rounded-lg bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.dataUrl} alt={label} className="size-full object-cover" />
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                          {label} · {fmtDate(photo.date)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">{p.photosTimeline}</h2>
            {days.map(([date, items]) => (
              <section key={date} className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-bold">
                  <span className="size-2 rounded-full bg-primary" />
                  {fmtDate(date)}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setViewId(x.id)}
                      className="aspect-[3/4] overflow-hidden rounded-xl bg-secondary"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={x.dataUrl} alt={fmtDate(x.date)} className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      {viewing ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
            <span className="text-sm font-semibold">{fmtDate(viewing.date)}</span>
            <button
              type="button"
              onClick={() => setViewId(null)}
              aria-label={t.common.cancel}
              className="grid size-9 place-items-center rounded-full bg-white/15"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.dataUrl} alt={fmtDate(viewing.date)} className="size-full object-contain" />
          </div>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center">
            <button
              type="button"
              onClick={() => void remove(viewing.id)}
              className="text-sm font-medium text-red-400"
            >
              {p.photosDelete}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
