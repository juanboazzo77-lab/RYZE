import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { MemberGym } from '@/server/gyms';

/**
 * Tarjeta del gimnasio del socio: "Gimnasio × Forza AI", con el logo y el color del gimnasio. Los colores del
 * resto de la app ya vienen del layout; acá el color se usa además en el borde.
 */
export function GymBrandCard({ gym, routineCount }: { gym: MemberGym; routineCount: number }) {
  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border bg-white">
          {gym.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={gym.logoUrl} alt="" className="size-full object-contain p-1" />
          ) : (
            <span className="text-lg font-bold text-primary">{gym.name.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <span className="text-lg font-light text-muted-foreground" aria-hidden="true">
          ×
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border bg-white">
          <Image src="/brand/logo.png" alt="Forza AI" width={30} height={30} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{gym.name} × Forza AI</p>
          <p className="text-xs text-muted-foreground">
            {routineCount > 0 ? `${routineCount} ${routineCount === 1 ? 'rutina' : 'rutinas'} de tu gimnasio` : 'Tu gimnasio y tu entrenador con IA'}
          </p>
        </div>
        {routineCount > 0 ? <ChevronRight className="size-5 shrink-0 text-muted-foreground" /> : null}
      </div>
    </>
  );
  const cls = 'block rounded-2xl border border-l-[6px] border-l-primary bg-card p-3.5 shadow-sm';
  return routineCount > 0 ? (
    <Link href="/training/gym" className={`${cls} transition-colors hover:bg-accent`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}
