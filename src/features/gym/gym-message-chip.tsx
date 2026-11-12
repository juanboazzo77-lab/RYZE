import Link from 'next/link';
import { Megaphone } from 'lucide-react';

/** Aviso en el inicio: el último mensaje que mandó el gimnasio. */
export function GymMessageChip({ gymName, message }: { gymName: string; message: { title: string } }) {
  return (
    <Link href="/training/gym" className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-accent">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Megaphone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{message.title}</p>
        <p className="text-xs text-muted-foreground">Aviso de {gymName}</p>
      </div>
      <span className="shrink-0 text-sm font-medium text-primary">Leer</span>
    </Link>
  );
}
