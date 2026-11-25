'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NoteStatus } from '@/server/admin-notes-shared';
import { changeNoteStatus, removeNote } from './note-actions';

export function NoteControls({ id, status }: { id: string; status: NoteStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else toast.error('No se pudo actualizar.');
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'DONE' ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => changeNoteStatus({ id, status: 'PENDING' }))}>
          Reabrir
        </Button>
      ) : (
        <Button size="sm" disabled={pending} onClick={() => run(() => changeNoteStatus({ id, status: 'DONE' }))}>
          Marcar resuelta
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto text-muted-foreground"
        disabled={pending}
        aria-label="Borrar nota"
        onClick={() => {
          if (window.confirm('¿Borrar esta nota? No se puede deshacer.')) run(() => removeNote({ id }));
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
