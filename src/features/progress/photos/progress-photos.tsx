'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Loader2, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useT } from '@/i18n/provider';
import { downscaleImage } from '@/lib/image/downscale';
import { cn } from '@/lib/utils';
import {
  POSES,
  addPhoto,
  deletePhoto,
  listPhotos,
  photoStorageAvailable,
  type Pose,
  type ProgressPhoto,
} from './photo-store';

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

export function ProgressPhotos({ todayISO }: { todayISO: string }) {
  const t = useT();
  const p = t.progress;
  const poseLabel: Record<Pose, string> = {
    front: p.photosPoseFront,
    side: p.photosPoseSide,
    back: p.photosPoseBack,
  };

  // Se decide en el navegador: en el servidor no existe IndexedDB y el HTML no coincidiría.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [pose, setPose] = useState<Pose>('front');
  const [newPose, setNewPose] = useState<Pose>('front');
  const [newDate, setNewDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>('slider');
  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);
  const [pos, setPos] = useState(50);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const ofPose = useMemo(() => (photos ?? []).filter((x) => x.pose === pose), [photos, pose]);

  // Por defecto se compara la primera foto con la última de la pose elegida.
  const before = ofPose.find((x) => x.id === beforeId) ?? ofPose[0] ?? null;
  const after = ofPose.find((x) => x.id === afterId) ?? ofPose[ofPose.length - 1] ?? null;
  const canCompare = ofPose.length >= 2 && before && after && before.id !== after.id;

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    setSaving(true);
    try {
      const dataUrl = await downscaleImage(file);
      const saved = await addPhoto({ date: newDate || todayISO, pose: newPose, dataUrl });
      toast.success(p.photosSaved);
      setPose(newPose);
      setBeforeId(null);
      setAfterId(saved.id);
      await reload();
    } catch {
      toast.error(p.photosErr);
    } finally {
      setSaving(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function remove(id: string) {
    if (!confirm(p.photosDeleteConfirm)) return;
    try {
      await deletePhoto(id);
      if (beforeId === id) setBeforeId(null);
      if (afterId === id) setAfterId(null);
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{p.photosAddTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="photo-pose">{p.photosPose}</Label>
              <NativeSelect
                id="photo-pose"
                value={newPose}
                onChange={(e) => setNewPose(e.target.value as Pose)}
              >
                {POSES.map((x) => (
                  <option key={x} value={x}>
                    {poseLabel[x]}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo-date">{p.photosDate}</Label>
              <Input
                id="photo-date"
                type="date"
                value={newDate}
                max={todayISO}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onFile(e.target.files)}
          />
          <Button className="w-full" disabled={saving} onClick={() => fileInput.current?.click()}>
            {saving ? <Loader2 className="animate-spin" /> : <Camera />}
            {p.photosAdd}
          </Button>
        </CardContent>
      </Card>

      <div className="flex rounded-lg border bg-secondary p-0.5 text-sm">
        {POSES.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => {
              setPose(x);
              setBeforeId(null);
              setAfterId(null);
            }}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 font-medium transition-colors',
              pose === x
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {poseLabel[x]}
          </button>
        ))}
      </div>

      {photos === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : ofPose.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{p.photosEmpty}</p>
      ) : (
        <>
          {canCompare && before && after ? (
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="photo-before">{p.photosBefore}</Label>
                    <NativeSelect
                      id="photo-before"
                      value={before.id}
                      onChange={(e) => setBeforeId(e.target.value)}
                    >
                      {ofPose.map((x) => (
                        <option key={x.id} value={x.id}>
                          {fmtShort(x.date)}
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
                      {ofPose.map((x) => (
                        <option key={x.id} value={x.id}>
                          {fmtShort(x.date)}
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
          ) : (
            <p className="text-center text-sm text-muted-foreground">{p.photosNeedTwo}</p>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">{p.photosTimeline}</h2>
            <div className="grid grid-cols-3 gap-2">
              {[...ofPose].reverse().map((x) => (
                <div key={x.id} className="relative">
                  <div className="aspect-[3/4] overflow-hidden rounded-md bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.dataUrl} alt={fmtDate(x.date)} className="size-full object-cover" />
                  </div>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">{fmtDate(x.date)}</p>
                  <button
                    type="button"
                    onClick={() => void remove(x.id)}
                    aria-label={p.photosDelete}
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
