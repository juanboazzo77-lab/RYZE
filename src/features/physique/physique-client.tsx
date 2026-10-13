'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhotoPicker } from '@/components/form/photo-picker';
import { useT } from '@/i18n/provider';
import { interpolate } from '@/i18n/interpolate';
import { cn } from '@/lib/utils';
import {
  analyzePhysiqueReport,
  applyPhysiqueToCoachProfile,
  deletePhysiqueAnalysis,
} from './actions';
import type { PhysiqueEntry } from './queries';
import { PhysiqueReport } from './physique-report';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function PhysiqueClient({
  initial,
  canApplyToCoach,
}: {
  initial: PhysiqueEntry[];
  canApplyToCoach: boolean;
}) {
  const t = useT();
  const tp = t.physique;
  const router = useRouter();

  const [entries, setEntries] = useState(initial);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoKey, setPhotoKey] = useState(0);
  const [note, setNote] = useState('');
  const [latestId, setLatestId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function analyze() {
    if (photos.length === 0) {
      toast.error(tp.errNoPhotos);
      return;
    }
    startAnalyze(async () => {
      try {
        const res = await analyzePhysiqueReport({ photos, note: note.trim() || undefined });
        if (res.ok && res.data) {
          const created = res.data;
          setEntries((prev) => [created, ...prev]);
          setLatestId(created.id);
          setOpenId(created.id);
          setPhotos([]);
          setPhotoKey((k) => k + 1);
          setNote('');
          router.refresh();
        } else {
          toast.error(
            res.error === 'BLOCKED'
              ? tp.errBlocked
              : res.error === 'NOT_CONFIGURED'
                ? tp.errNotConfigured
                : res.error === 'LIMIT'
                  ? tp.errLimit
                  : res.error === 'BUSY' || res.error === 'TIMEOUT'
                    ? tp.errBusy
                    : `${tp.errGeneric} (${res.error ?? 'ERROR'})`,
          );
        }
      } catch {
        // Corte de red o fotos demasiado pesadas: no romper la pantalla.
        toast.error(tp.errGeneric);
      }
    });
  }

  async function remove(id: string) {
    if (!confirm(tp.deleteConfirm)) return;
    setBusyId(id);
    const res = await deletePhysiqueAnalysis({ id }).catch(() => null);
    setBusyId(null);
    if (res?.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (openId === id) setOpenId(null);
    } else toast.error(tp.errGeneric);
  }

  async function apply(id: string) {
    setBusyId(id);
    const res = await applyPhysiqueToCoachProfile({ id }).catch(() => null);
    setBusyId(null);
    if (res?.ok) toast.success(tp.applied);
    else toast.error(tp.errGeneric);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tp.newTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{tp.photosHint}</p>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <PhotoPicker
            key={photoKey}
            value={photos}
            onChange={setPhotos}
            max={3}
            labels={{ add: tp.add, remove: tp.remove, max: tp.max, error: tp.photoError }}
          />
          <div className="space-y-1.5">
            <Label htmlFor="physique-note">{tp.noteLabel}</Label>
            <Textarea
              id="physique-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={tp.notePh}
              maxLength={400}
              rows={2}
            />
          </div>
          <Button className="w-full" onClick={analyze} disabled={analyzing || photos.length === 0}>
            {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {analyzing ? tp.analyzing : tp.analyze}
          </Button>
          <p className="text-[11px] text-muted-foreground">{tp.privacy}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">{tp.historyTitle}</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tp.historyEmpty}</p>
        ) : (
          entries.map((e) => {
            const open = openId === e.id;
            return (
              <Card key={e.id} className={cn(e.id === latestId && 'border-primary/50')}>
                <CardContent className="space-y-3 py-3">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : e.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {fmtDate(e.createdAt)}
                        {e.report.bodyFatEstimate ? (
                          <span className="ml-2 tabular-nums text-primary">{e.report.bodyFatEstimate}</span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {interpolate(tp.photosCount, { n: e.photoCount })}
                        {e.report.summary && !open ? ` · ${e.report.summary}` : ''}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
                    />
                  </button>

                  {open ? (
                    <>
                      <PhysiqueReport report={e.report} />
                      <div className="flex flex-wrap gap-2 border-t pt-3">
                        {canApplyToCoach ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === e.id}
                            onClick={() => apply(e.id)}
                          >
                            {tp.apply}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={busyId === e.id}
                          onClick={() => remove(e.id)}
                        >
                          <Trash2 className="size-4" />
                          {tp.delete}
                        </Button>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
