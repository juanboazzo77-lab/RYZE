import type { Metadata } from 'next';
import Link from 'next/link';
import { getTodaySummary } from '@/server/admin-hub';
import { Kpi, Section, ago, usd } from '@/features/admin/ui';
import { DigestButton } from '@/features/admin/digest-button';

export const metadata: Metadata = { title: 'Gestión', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminTodayPage() {
  let s: Awaited<ReturnType<typeof getTodaySummary>>;
  try {
    s = await getTodaySummary();
  } catch (e) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Gestión</h1>
        <p className="text-sm text-destructive">No se pudo armar el resumen.</p>
        <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-xs">{e instanceof Error ? e.message : String(e)}</pre>
      </div>
    );
  }

  const todo = s.gyms.pending.length + (s.invitesPending > 0 ? 1 : 0) + s.billing.overdueCount + s.errors.last24h + s.subscribers.pastDue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hoy</h1>
        <p className="text-xs text-muted-foreground">
          {todo === 0 ? 'Nada urgente por ahora.' : `${todo} cosas para mirar.`} Actualizado {new Date(s.generatedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Errores (24 h)"
          value={s.errors.last24h}
          sub={`${s.errors.open} abiertos en total`}
          tone={s.errors.last24h > 0 ? 'alert' : 'good'}
          href="/errores"
        />
        <Kpi
          label="Gimnasios pendientes"
          value={s.gyms.pending.length}
          sub={`${s.gyms.active} activos · ${s.gyms.members} socios`}
          tone={s.gyms.pending.length > 0 ? 'alert' : 'normal'}
          href="/gimnasios"
        />
        <Kpi
          label="Altas de socios"
          value={s.invitesPending}
          sub="Esperan tu aprobación"
          tone={s.invitesPending > 0 ? "alert" : "normal"}
          href="/altas"
        />
        <Kpi
          label="Cobros vencidos"
          value={s.billing.overdueCount}
          sub={s.billing.overdueCount ? `${usd(s.billing.overdueUsd)} por cobrar` : 'Todo al día'}
          tone={s.billing.overdueCount > 0 ? 'alert' : 'good'}
          href="/cobros"
        />
        <Kpi
          label="Pagos fallidos (suscriptores)"
          value={s.subscribers.pastDue}
          sub={`${s.subscribers.total} suscriptores en total`}
          tone={s.subscribers.pastDue > 0 ? 'alert' : 'normal'}
          href="/suscriptores"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Usuarios nuevos (24 h)" value={s.users.new24h} sub={`${s.users.new7d} en 7 días`} />
        <Kpi label="Suscriptores nuevos (7 días)" value={s.subscribers.new7d} href="/suscriptores" />
        <Kpi label="Usuarios en total" value={s.users.total} />
        <Kpi
          label="Por cobrar a gimnasios"
          value={usd(s.billing.pendingUsd)}
          sub={`Cobrado este mes: ${usd(s.billing.collectedThisMonthUsd)}`}
          href="/cobros"
        />
      </div>

      {s.gyms.pending.length > 0 ? (
        <Section title="Gimnasios esperando tu decisión" href="/gimnasios" linkText="Revisar">
          <ul className="divide-y rounded-xl border">
            {s.gyms.pending.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">
                  {g.name}
                  {g.city ? <span className="font-normal text-muted-foreground"> · {g.city}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{ago(g.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {s.overdue.length > 0 ? (
        <Section title="Cobros vencidos" href="/cobros" linkText="Ir a cobros">
          <ul className="divide-y rounded-xl border">
            {s.overdue.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{p.gymName}</span>
                  <span className="text-muted-foreground"> · {p.period} · vencía el {p.dueDate}</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{usd(p.amountUsd)}</span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Errores recientes" href="/errores">
        {s.errors.recent.length === 0 ? (
          <p className="rounded-xl border p-3 text-sm text-muted-foreground">No hay errores abiertos.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {s.errors.recent.map((e) => (
              <li key={e.id} className="space-y-0.5 px-3 py-2.5 text-sm">
                <p className="truncate font-medium">{e.message}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {e.path ?? 'sin ruta'} · {e.count} {e.count === 1 ? 'vez' : 'veces'} · {ago(e.lastSeen)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <DigestButton />

      <p className="text-xs text-muted-foreground">
        Números de negocio, costos de IA y retención en{' '}
        <Link href="/numeros" className="underline hover:text-foreground">
          Números
        </Link>
        .
      </p>
    </div>
  );
}
