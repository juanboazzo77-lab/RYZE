import Link from 'next/link';
import { Timer } from 'lucide-react';
import { fill, GYM } from './copy';

/**
 * Aviso en el inicio para quien entró a su gimnasio con el código: cuántos días le quedan de prueba gratis o, si ya
 * terminó, que active su plan (el mismo que se activa escaneando el QR del gimnasio).
 */
export function GymTrialCard({ gymName, gymCode, state, daysLeft }: { gymName: string; gymCode: string | null; state: 'ACTIVE' | 'ENDED'; daysLeft: number }) {
  const active = state === 'ACTIVE';
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-3.5 ${active ? 'bg-card' : 'border-warning/50 bg-warning/10'}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Timer className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">{active ? fill(GYM.trialActiveTitle, { days: daysLeft === 1 ? '1 día' : `${daysLeft} días` }) : GYM.trialEndedTitle}</p>
        <p className="text-xs text-muted-foreground">{fill(active ? GYM.trialActiveText : GYM.trialEndedText, { name: gymName })}</p>
        {gymCode ? (
          <Link href={`/g/${gymCode}`} className="mt-1 inline-flex h-9 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
            {GYM.activatePlan}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
