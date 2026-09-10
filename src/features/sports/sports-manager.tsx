'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Plus, Trash2, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/form/segmented';
import { ChipMulti } from '@/components/form/chip-multi';
import { NumberStepper } from '@/components/form/number-stepper';
import { useT } from '@/i18n/provider';
import { COMMON_SPORTS, COMPETITION_PRIORITIES, SPORT_LEVELS } from '@/lib/domain-options';
import type { SportView } from './queries';
import { addCompetition, addSport, deleteCompetition, deleteSport } from './actions';

const WD = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const dayLabels = (days: number[]) => days.map((d) => WD[d - 1]).filter(Boolean).join(' · ');

export function SportsManager({ sports }: { sports: SportView[] }) {
  const t = useT();
  const ts = t.sports;
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      {sports.map((s) => (
        <Card key={s.id}>
          <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-primary" />
                {s.name}
                {s.level ? <Badge variant="secondary">{ts.levels[s.level as 'amateur']}</Badge> : null}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.sessionsPerWeek} {ts.perWeek}
                {s.sessionDays.length ? ` · ${dayLabels(s.sessionDays)}` : ''}
                {s.goal ? ` · ${s.goal}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label={ts.deleteSport}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteSport({ id: s.id });
                  if (!r.ok) toast.error(t.common.error);
                })
              }
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {s.competitions.length > 0 ? (
              <ul className="divide-y rounded-lg border">
                {s.competitions.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 p-2.5 text-sm">
                    <Badge variant={c.priority === 'A' ? 'warning' : 'secondary'}>{c.priority}</Badge>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {c.dateISO}
                      {c.daysUntil >= 0 ? ` · ${c.daysUntil}d` : ''}
                    </span>
                    <button
                      type="button"
                      aria-label={t.common.delete}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        start(async () => {
                          await deleteCompetition({ id: c.id });
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <CompetitionForm sportProfileId={s.id} />
          </CardContent>
        </Card>
      ))}

      <AddSportForm hasAny={sports.length > 0} />
    </div>
  );
}

function CompetitionForm({ sportProfileId }: { sportProfileId: string }) {
  const t = useT();
  const ts = t.sports;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<'A' | 'B' | 'C'>('B');
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" />
        {ts.addCompetition}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed p-3">
      <Input placeholder={ts.compNamePh} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1" />
        <Segmented
          className="flex-1"
          options={COMPETITION_PRIORITIES.map((p) => ({ value: p, label: p }))}
          value={priority}
          onChange={setPriority}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={pending || !name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)}
          onClick={() =>
            start(async () => {
              const r = await addCompetition({ sportProfileId, name, date, priority });
              if (r.ok) {
                setName('');
                setDate('');
                setPriority('B');
                setOpen(false);
              } else toast.error(t.common.error);
            })
          }
        >
          {t.common.add}
        </Button>
      </div>
    </div>
  );
}

function AddSportForm({ hasAny }: { hasAny: boolean }) {
  const t = useT();
  const ts = t.sports;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<(typeof SPORT_LEVELS)[number]>('amateur');
  const [sessions, setSessions] = useState(3);
  const [days, setDays] = useState<number[]>([]);
  const [goal, setGoal] = useState('');
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {hasAny ? ts.addAnother : ts.addSport}
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <Input
          list="sports-list"
          placeholder={ts.namePh}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <datalist id="sports-list">
          {COMMON_SPORTS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <Segmented
          options={SPORT_LEVELS.map((l) => ({ value: l, label: ts.levels[l] }))}
          value={level}
          onChange={setLevel}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{ts.sessions}</span>
          <NumberStepper value={sessions} min={0} max={14} onChange={setSessions} />
        </div>
        <ChipMulti
          options={WD.map((label, i) => ({ value: String(i + 1), label }))}
          value={days.map(String)}
          onChange={(v) => setDays(v.map(Number).sort((a, b) => a - b))}
        />
        <Input placeholder={ts.goalPh} value={goal} onChange={(e) => setGoal(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={pending || !name.trim()}
            onClick={() =>
              start(async () => {
                const r = await addSport({
                  name,
                  level,
                  sessionsPerWeek: sessions,
                  sessionDays: days,
                  goal: goal.trim() || undefined,
                });
                if (r.ok) {
                  setName('');
                  setGoal('');
                  setDays([]);
                  setOpen(false);
                } else toast.error(t.common.error);
              })
            }
          >
            {t.common.add}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
