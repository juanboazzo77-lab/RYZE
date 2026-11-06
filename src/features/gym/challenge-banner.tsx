import Link from 'next/link';
import { Trophy } from 'lucide-react';

/** Aviso en el inicio: hay un reto del gimnasio activo o por empezar. */
export function ChallengeBanner({ challenge }: { challenge: { title: string; status: 'UPCOMING' | 'ACTIVE' | 'ENDED'; daysLeft: number; joined: boolean } }) {
  const d = challenge.daysLeft;
  const when =
    challenge.status === 'UPCOMING'
      ? d === 0
        ? 'empieza hoy'
        : `empieza en ${d} ${d === 1 ? 'día' : 'días'}`
      : d === 0
        ? 'último día'
        : `faltan ${d} ${d === 1 ? 'día' : 'días'}`;
  return (
    <Link href="/training/gym/retos" className="flex items-center gap-3 rounded-2xl border bg-accent p-3.5 transition-opacity hover:opacity-90">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Trophy className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{challenge.title}</p>
        <p className="text-xs text-muted-foreground">
          Reto del gimnasio · {when}
          {challenge.joined ? ' · ya estás sumado' : ''}
        </p>
      </div>
      <span className="shrink-0 text-sm font-medium text-primary">{challenge.joined ? 'Ver ranking' : 'Sumarme'}</span>
    </Link>
  );
}
