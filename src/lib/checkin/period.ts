import { DateTime } from 'luxon';

/**
 * Período que cubre una revisión: desde la revisión anterior hasta hoy (no la semana calendario).
 * Las fechas son yyyy-mm-dd y los dos extremos están incluidos.
 */
export interface ReviewPeriod {
  startISO: string;
  endISO: string;
  /** Cantidad de días, contando los dos extremos. */
  days: number;
}

/** Tope hacia atrás: pasadas cuatro semanas sin revisar, no tiene sentido sumar más. */
const MAX_DAYS = 28;
/** Si la primera revisión se hace tarde, se ve al menos esta cantidad de días. */
const MIN_FIRST_DAYS = 4;

const addDays = (iso: string, n: number) => DateTime.fromISO(iso, { zone: 'utc' }).plus({ days: n }).toISODate()!;
const diffDays = (fromISO: string, toISO: string) =>
  Math.round(DateTime.fromISO(toISO, { zone: 'utc' }).diff(DateTime.fromISO(fromISO, { zone: 'utc' }), 'days').days);

/**
 * - Si ya mandó una revisión en esta misma semana y la edita, sigue cubriendo desde donde empezaba.
 * - Si hubo una revisión anterior, empieza el día siguiente a esa (o al último día que cubría).
 * - Si es la primera, empieza el día después del último día de revisión elegido (p. ej. si la
 *   revisión es los miércoles, desde el miércoles pasado); si eso queda en muy pocos días, usa los
 *   últimos 7.
 */
export function computeReviewPeriod(input: {
  todayISO: string;
  /** Día de revisión elegido: 1 lunes … 7 domingo. */
  reviewWeekday: number;
  /** Inicio de la revisión de esta semana, si ya mandó una. */
  resubmitStartISO?: string | null;
  /** Último día que cubría la revisión anterior. */
  previousEndISO?: string | null;
}): ReviewPeriod {
  const { todayISO, reviewWeekday, resubmitStartISO, previousEndISO } = input;

  let start: string;
  if (resubmitStartISO) {
    start = resubmitStartISO;
  } else if (previousEndISO) {
    start = addDays(previousEndISO, 1);
  } else {
    // Último día de revisión elegido, estrictamente antes de hoy (1 a 7 días atrás).
    const todayWeekday = DateTime.fromISO(todayISO, { zone: 'utc' }).weekday;
    const back = ((todayWeekday - reviewWeekday + 6) % 7) + 1;
    start = addDays(todayISO, -back + 1);
    if (diffDays(start, todayISO) + 1 < MIN_FIRST_DAYS) start = addDays(todayISO, -6);
  }

  if (start > todayISO) start = todayISO;
  const earliest = addDays(todayISO, -(MAX_DAYS - 1));
  if (start < earliest) start = earliest;

  return { startISO: start, endISO: todayISO, days: diffDays(start, todayISO) + 1 };
}
