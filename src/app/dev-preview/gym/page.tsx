import { notFound } from 'next/navigation';
import { CalendarDays, ChevronRight, Trophy } from 'lucide-react';
import { GymBrandCard } from '@/features/gym/gym-brand-card';
import { NextClassChip } from '@/features/gym/next-class-chip';
import { ChallengeBanner } from '@/features/gym/challenge-banner';
import { ClassButton } from '@/features/gym/class-button';
import { brandTheme } from '@/features/gym/brand';
import { Badge } from '@/components/ui/badge';

/**
 * Cómo ve la app un cliente de un gimnasio, con datos de ejemplo: SÓLO en desarrollo (sirve para sacar las capturas
 * del folleto para gimnasios sin usar una cuenta real). En producción no existe (404).
 */

const GYM = { gymId: 'demo', name: 'Iron Gym', logoUrl: null, brandColor: '#d9381e' };
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const CLASSES = [
  { id: 'c1', name: 'Funcional', time: '19:00 a 20:00', who: 'Profe Lucía', left: 4, state: 'MINE' as const, inPlan: true },
  { id: 'c2', name: 'Spinning', time: '20:00 a 21:00', who: 'Profe Marcos', left: 8, state: 'BOOKABLE' as const, inPlan: true },
  { id: 'c3', name: 'Yoga', time: '21:00 a 22:00', who: 'Profe Ana', left: 10, state: 'BOOKABLE' as const, inPlan: false },
  { id: 'c4', name: 'Boxeo', time: '18:00 a 19:00', who: 'Profe Diego', left: 0, state: 'FULL' as const, inPlan: true },
];

function Hub() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Buen día, Ana</p>
      <GymBrandCard gym={GYM} routineCount={3} />
      <NextClassChip booking={{ name: 'Funcional', date: tomorrow, startTime: '19:00' }} />
      <ChallengeBanner challenge={{ title: '30 días sin faltar', status: 'ACTIVE', daysLeft: 12, joined: true }} />
      <section className="space-y-1 rounded-xl border bg-card p-3 text-sm">
        <p className="font-semibold">Tu plan: 3 veces por semana</p>
        <p className="text-xs text-muted-foreground">Solo: Funcional, Spinning, Boxeo</p>
        <p className="text-xs text-muted-foreground">2 de 3 reservas usadas esta semana</p>
      </section>
      <div className="space-y-2">
        {[
          { icon: CalendarDays, t: 'Clases', s: 'Reservá tu lugar' },
          { icon: Trophy, t: 'Retos', s: 'Sumate y mirá el ranking' },
        ].map((i) => (
          <div key={i.t} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <i.icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{i.t}</span>
              <span className="block text-xs text-muted-foreground">{i.s}</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Classes() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">Clases</h1>
      <section className="space-y-1 rounded-xl border bg-card p-3 text-sm">
        <p className="font-semibold">Tu plan: 3 veces por semana</p>
        <p className="text-xs text-muted-foreground">Solo: Funcional, Spinning, Boxeo</p>
        <p className="text-xs text-muted-foreground">2 de 3 reservas usadas esta semana</p>
      </section>
      <h2 className="text-sm font-semibold">Mañana</h2>
      <ul className="divide-y rounded-xl border bg-card">
        {CLASSES.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {c.time} · {c.who}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{c.left === 0 ? 'Completa' : c.left === 1 ? 'Queda 1 lugar' : `Quedan ${c.left} lugares`}</p>
            </div>
            <ClassButton classId={c.id} date={tomorrow} state={c.state} inPlan={c.inPlan} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Routines() {
  const days = [
    { name: 'Día 1 · Piernas', ex: [['Sentadilla', '4 x 10'], ['Prensa 45°', '3 x 12'], ['Camilla de isquios', '3 x 12'], ['Gemelos de pie', '4 x 15']] },
    { name: 'Día 2 · Empuje', ex: [['Press banca', '4 x 8'], ['Press inclinado con mancuernas', '3 x 10'], ['Fondos', '3 x 12']] },
  ];
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Rutinas de tu gimnasio</h2>
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">Fuerza · 3 días</p>
            <p className="text-sm text-muted-foreground">Rutina del profe Marcos para ganar fuerza.</p>
            <p className="mt-1 text-xs text-muted-foreground">3 días · 11 ejercicios</p>
          </div>
          <Badge variant="secondary">Intermedio</Badge>
        </div>
        <div className="space-y-4 border-t p-4">
          {days.map((d) => (
            <div key={d.name} className="space-y-2">
              <p className="text-sm font-semibold">{d.name}</p>
              <ul className="divide-y rounded-lg border">
                {d.ex.map(([n, r]) => (
                  <li key={n} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span>{n}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DevGymPreview({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  if (process.env.NODE_ENV === 'production') notFound();
  const { s } = await searchParams;
  const theme = brandTheme(GYM.brandColor) ?? {};
  return (
    <div className="min-h-screen bg-background text-foreground" style={theme as React.CSSProperties}>
      {/* Ancho de un celular fijo y sin el indicador de desarrollo de Next: es para sacar capturas. */}
      <style>{'nextjs-portal { display: none !important; }'}</style>
      <div className="space-y-3 px-4 pb-6 pt-8" style={{ width: 390 }}>
        {s === 'clases' ? <Classes /> : s === 'rutinas' ? <Routines /> : <Hub />}
      </div>
    </div>
  );
}
