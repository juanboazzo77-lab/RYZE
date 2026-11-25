import type { Metadata } from 'next';
import Link from 'next/link';
import { listNotes } from '@/server/admin-notes';
import { NoteForm } from '@/features/admin/note-form';
import { NoteList } from '@/features/admin/note-list';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Buzón', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Buzón del administrador: anotar errores y mejoras desde cualquier dispositivo, para resolverlos con Claude. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const done = ver === 'resueltas';
  const notes = await listNotes(done);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buzón</h1>
        <p className="text-sm text-muted-foreground">
          Anotá acá los errores y las mejoras cuando no estés en tu computadora. Después, en una conversación con Claude, pedile
          &quot;revisá el buzón&quot;.
        </p>
      </div>

      <NoteForm />

      <div className="flex gap-1">
        {[
          { href: '/buzon', label: 'Pendientes', active: !done },
          { href: '/buzon?ver=resueltas', label: 'Resueltas', active: done },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={cn('rounded-full px-3 py-1 text-sm', t.active ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-secondary/60')}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <NoteList notes={notes} done={done} />
    </div>
  );
}
