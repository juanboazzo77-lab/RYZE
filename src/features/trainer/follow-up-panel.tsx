'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  addTrainerNote,
  giveCheckinFeedback,
  removeTrainerNote,
  updateNextFollowUp,
} from './followup-actions';
import { CHAT, FU } from './copy';
import type { FollowUpNote } from '@/server/trainer-followup';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

/** Seguimiento 1 a 1: próxima fecha y notas privadas del entrenador sobre el cliente. */
export function FollowUpPanel({
  clientId,
  nextFollowUp,
  notes,
  todayISO,
}: {
  clientId: string;
  nextFollowUp: string | null;
  notes: FollowUpNote[];
  todayISO: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(nextFollowUp ?? '');
  const [note, setNote] = useState('');
  const [pending, start] = useTransition();

  function saveDate(value: string | null) {
    start(async () => {
      const res = await updateNextFollowUp({ clientId, date: value });
      if (res.ok) {
        if (!value) setDate('');
        toast.success(FU.savedOk);
        router.refresh();
      } else toast.error(FU.error);
    });
  }

  function saveNote() {
    const body = note.trim();
    if (!body) return;
    start(async () => {
      const res = await addTrainerNote({ clientId, body });
      if (res.ok) {
        setNote('');
        router.refresh();
      } else toast.error(FU.error);
    });
  }

  function removeNote(noteId: string) {
    start(async () => {
      const res = await removeTrainerNote({ noteId, clientId });
      if (res.ok) router.refresh();
      else toast.error(FU.error);
    });
  }

  const overdue = nextFollowUp !== null && nextFollowUp < todayISO;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-sm font-medium">
          {FU.nextLabel}
          {nextFollowUp ? (
            <span className={overdue ? 'ml-2 text-xs text-destructive' : 'ml-2 text-xs text-muted-foreground'}>
              {fmt(nextFollowUp)}
              {overdue ? ` · ${FU.nextOverdue}` : ''}
            </span>
          ) : (
            <span className="ml-2 text-xs text-muted-foreground">{FU.nextNone}</span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
          <Button size="sm" onClick={() => saveDate(date || null)} disabled={pending || !date}>
            {FU.nextSave}
          </Button>
          {nextFollowUp ? (
            <Button size="sm" variant="ghost" onClick={() => saveDate(null)} disabled={pending}>
              {FU.nextClear}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{FU.notesTitle}</p>
          <p className="text-xs text-muted-foreground">{FU.notesHelp}</p>
        </div>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={FU.notePlaceholder}
          rows={3}
          maxLength={2000}
        />
        <Button size="sm" onClick={saveNote} disabled={pending || !note.trim()}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {FU.noteAdd}
        </Button>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{FU.noNotes}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {notes.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block whitespace-pre-wrap break-words">{n.body}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{fmt(n.createdAt)}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => removeNote(n.id)}
                  disabled={pending}
                  aria-label={FU.noteDelete}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Feedback del entrenador a una revisión semanal: le llega al cliente por el chat. */
export function CheckinFeedbackForm({
  clientId,
  checkinId,
  existing,
}: {
  clientId: string;
  checkinId: string;
  existing: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function send() {
    const body = text.trim();
    if (!body) return;
    setProblem(null);
    start(async () => {
      const res = await giveCheckinFeedback({ clientId, checkinId, body });
      if (res.ok) {
        setText('');
        toast.success(FU.feedbackSent);
        router.refresh();
        return;
      }
      if (res.error === 'BLOCKED') setProblem(CHAT.blocked[res.reason ?? 'OFF_PLATFORM']);
      else if (res.error === 'RATE') setProblem(CHAT.rate);
      else setProblem(FU.error);
    });
  }

  return (
    <div className="space-y-2">
      {existing ? (
        <div className="rounded-lg bg-secondary/60 p-2.5 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{FU.feedbackDone}</p>
          <p className="whitespace-pre-wrap">{existing}</p>
        </div>
      ) : null}
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (problem) setProblem(null);
        }}
        placeholder={FU.feedbackPlaceholder}
        rows={2}
        maxLength={850}
      />
      {problem ? <p className="text-xs text-destructive">{problem}</p> : null}
      <Button size="sm" variant="outline" onClick={send} disabled={pending || !text.trim()}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {FU.feedbackSend}
      </Button>
    </div>
  );
}
