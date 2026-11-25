import type { NoteView } from '@/server/admin-notes';
import { Badge } from '@/components/ui/badge';
import { NoteControls } from './note-controls';
import { ago } from './ui';

export function NoteList({ notes, done }: { notes: NoteView[]; done: boolean }) {
  if (notes.length === 0) {
    return (
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        {done ? 'Todavía no hay notas resueltas.' : 'No hay nada pendiente.'}
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {notes.map((n) => (
        <li key={n.id} className="space-y-2 rounded-xl border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={n.kind === 'BUG' ? 'warning' : 'secondary'}>{n.kind === 'BUG' ? 'Error' : 'Mejora'}</Badge>
            {n.status === 'DOING' ? <Badge variant="secondary">En curso</Badge> : null}
            <span className="ml-auto text-xs text-muted-foreground">{ago(n.createdAt)}</span>
          </div>
          <p className="whitespace-pre-line break-words text-sm">{n.text}</p>
          {n.photoUrl ? (
            <a href={n.photoUrl} target="_blank" rel="noreferrer" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={n.photoUrl} alt="Captura adjunta" className="max-h-56 rounded-lg border" />
            </a>
          ) : null}
          {n.reply ? (
            <p className="whitespace-pre-line break-words rounded-lg bg-secondary p-2 text-sm">
              <span className="font-medium">Qué se hizo: </span>
              {n.reply}
            </p>
          ) : null}
          <NoteControls id={n.id} status={n.status} />
        </li>
      ))}
    </ul>
  );
}
