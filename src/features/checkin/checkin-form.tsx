'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import type { WeeklyCheckin } from '@prisma/client';
import { submitCheckin } from './actions';

function ScaleField({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">{lowLabel}</span>
        <div className="flex flex-1 justify-between gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n === value ? null : n)}
              className={cn(
                'size-9 flex-1 rounded-md border text-sm font-medium tabular-nums transition-colors',
                value === n ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground">{highLabel}</span>
      </div>
    </div>
  );
}

export function CheckinForm({ existing }: { existing: WeeklyCheckin | null }) {
  const t = useT();
  const tc = t.checkin;
  const [hunger, setHunger] = useState<number | null>(existing?.hunger ?? null);
  const [energy, setEnergy] = useState<number | null>(existing?.energy ?? null);
  const [sleep, setSleep] = useState<number | null>(existing?.sleep ?? null);
  const [trainingFeel, setTrainingFeel] = useState<number | null>(existing?.trainingFeel ?? null);
  const [dietAdherence, setDietAdherence] = useState<number | null>(existing?.dietAdherence ?? null);
  const [stress, setStress] = useState<number | null>(existing?.stress ?? null);
  const [outsideActivity, setOutsideActivity] = useState<number | null>(
    existing?.outsideActivity ?? null,
  );
  const [adherenceNote, setAdherenceNote] = useState(existing?.adherenceNote ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await submitCheckin({
        hunger,
        energy,
        sleep,
        trainingFeel,
        dietAdherence,
        stress,
        outsideActivity,
        adherenceNote: adherenceNote.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res.ok) toast.success(tc.submitted);
      else toast.error(tc.genericError);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{tc.thisWeek}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {existing ? <p className="text-sm text-muted-foreground">{tc.alreadySubmitted}</p> : null}
        <ScaleField label={tc.questions.hunger} value={hunger} onChange={setHunger} lowLabel={tc.scaleLow} highLabel={tc.scaleHigh} />
        <ScaleField label={tc.questions.energy} value={energy} onChange={setEnergy} lowLabel={tc.scaleLow} highLabel={tc.scaleHigh} />
        <ScaleField label={tc.questions.sleep} value={sleep} onChange={setSleep} lowLabel={tc.scaleLow} highLabel={tc.scaleHigh} />
        <ScaleField
          label={tc.questions.trainingFeel}
          value={trainingFeel}
          onChange={setTrainingFeel}
          lowLabel={tc.scaleLow}
          highLabel={tc.scaleHigh}
        />
        <ScaleField
          label={tc.questions.dietAdherence}
          value={dietAdherence}
          onChange={setDietAdherence}
          lowLabel={tc.scaleNone}
          highLabel={tc.scaleFull}
        />
        <ScaleField
          label={tc.questions.stress}
          value={stress}
          onChange={setStress}
          lowLabel={tc.scaleLowAmount}
          highLabel={tc.scaleHighAmount}
        />
        <ScaleField
          label={tc.questions.outsideActivity}
          value={outsideActivity}
          onChange={setOutsideActivity}
          lowLabel={tc.scaleLowAmount}
          highLabel={tc.scaleHighAmount}
        />
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{tc.questions.adherenceNote}</p>
          <Textarea value={adherenceNote} onChange={(e) => setAdherenceNote(e.target.value)} maxLength={500} />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{tc.questions.notes}</p>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
        <Button onClick={submit} disabled={pending} className="w-full" size="lg">
          {pending ? t.common.saving : existing ? tc.resubmit : tc.submit}
        </Button>
      </CardContent>
    </Card>
  );
}
