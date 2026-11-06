import type { TodaySummary } from './admin-hub';

/** Dólares sin decimales de más: US$ 1.234,5 */
const usd = (n: number) => `US$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export interface Digest {
  subject: string;
  text: string;
  /** Cosas que piden una decisión o un arreglo hoy. */
  urgent: number;
}

/**
 * Arma el resumen diario que se manda por mail: arriba lo que hay que hacer hoy (gimnasios por aprobar,
 * cobros vencidos, errores, pagos fallidos) y abajo cómo viene el día. Función pura, sin base de datos.
 */
export function buildDigest(s: TodaySummary): Digest {
  const urgent = s.gyms.pending.length + (s.invitesPending > 0 ? 1 : 0) + s.billing.overdueCount + s.errors.last24h + s.subscribers.pastDue;
  const lines: string[] = [];

  lines.push(urgent === 0 ? 'Nada urgente hoy.' : `Hay ${urgent} ${urgent === 1 ? 'cosa' : 'cosas'} para mirar hoy.`, '');

  if (s.gyms.pending.length > 0) {
    lines.push(`GIMNASIOS ESPERANDO TU DECISIÓN (${s.gyms.pending.length})`);
    for (const g of s.gyms.pending) lines.push(`- ${g.name}${g.city ? ` (${g.city})` : ''}`);
    lines.push('');
  }
  if (s.invitesPending > 0) {
    lines.push(`ALTAS DE SOCIOS ESPERANDO TU APROBACIÓN (${s.invitesPending})`, "Aprobalas en el panel, en Altas: cada persona recibe su invitación por mail.", "");
  }
  if (s.overdue.length > 0) {
    lines.push(`COBROS VENCIDOS (${s.billing.overdueCount}, ${usd(s.billing.overdueUsd)})`);
    for (const p of s.overdue) lines.push(`- ${p.gymName}, ${p.period}: ${usd(p.amountUsd)} (vencía el ${p.dueDate})`);
    lines.push('');
  }
  if (s.errors.last24h > 0) {
    lines.push(`ERRORES DE LAS ÚLTIMAS 24 H (${s.errors.last24h}, ${s.errors.open} abiertos en total)`);
    for (const e of s.errors.recent) lines.push(`- ${e.message.slice(0, 120)} · ${e.path ?? 'sin ruta'} · ${e.count} ${e.count === 1 ? 'vez' : 'veces'}`);
    lines.push('');
  }
  if (s.subscribers.pastDue > 0) {
    lines.push(`SUSCRIPTORES CON PAGO FALLIDO (${s.subscribers.pastDue})`, '');
  }

  lines.push('CÓMO VIENE');
  lines.push(`- Usuarios nuevos: ${s.users.new24h} en 24 h, ${s.users.new7d} en 7 días (${s.users.total} en total)`);
  lines.push(`- Suscriptores nuevos en 7 días: ${s.subscribers.new7d} (${s.subscribers.total} en total)`);
  lines.push(`- Gimnasios activos: ${s.gyms.active}, con ${s.gyms.members} socios${s.gyms.full > 0 ? ` (${s.gyms.full} con el cupo lleno)` : ''}`);
  lines.push(`- Por cobrar a gimnasios: ${usd(s.billing.pendingUsd)}. Cobrado este mes: ${usd(s.billing.collectedThisMonthUsd)}`);

  return {
    subject: urgent === 0 ? 'Forza AI · resumen de hoy: nada urgente' : `Forza AI · resumen de hoy: ${urgent} para mirar`,
    text: lines.join('\n'),
    urgent,
  };
}
