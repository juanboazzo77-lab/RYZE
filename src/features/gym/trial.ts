/**
 * Prueba de 3 días para quien entra a un gimnasio con el código (en vez de escanear el QR y pagar su plan). Lógica pura.
 *
 * - QR del gimnasio: la persona activa su plan en la página del gimnasio y queda conectada (source WEB).
 * - Código del gimnasio: la persona se conecta sola, usa todo 3 días gratis y después tiene que pagar su plan (por la
 *   página del gimnasio o uno propio) para seguir (source CODE).
 */

export const GYM_TRIAL_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type GymTrialState = 'NONE' | 'ACTIVE' | 'ENDED';

/** Cuándo termina una prueba que empieza ahora. */
export function trialEndsFrom(now: Date): Date {
  return new Date(now.getTime() + GYM_TRIAL_DAYS * DAY_MS);
}

/**
 * Estado de la prueba de un socio. Solo los que entraron con el código (`CODE`) tienen prueba: el resto (QR/pago por la
 * web o socios que paga el gimnasio) no tiene, siempre cuentan con el acceso del gimnasio.
 */
export function trialState(member: { source: string; trialEndsAt: Date | null }, now: Date = new Date()): GymTrialState {
  if (member.source !== 'CODE') return 'NONE';
  if (!member.trialEndsAt) return 'ENDED';
  return member.trialEndsAt.getTime() > now.getTime() ? 'ACTIVE' : 'ENDED';
}

/** ¿El socio tiene el acceso completo del gimnasio? Sí, salvo que su prueba ya terminó. */
export function memberHasGymAccess(member: { source: string; trialEndsAt: Date | null }, now: Date = new Date()): boolean {
  return trialState(member, now) !== 'ENDED';
}

/** Días que le quedan (redondeado hacia arriba: con 1 hora de prueba quedan "1 día"). 0 si ya terminó. */
export function trialDaysLeft(trialEndsAt: Date | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS);
}

/**
 * Prueba que se le da a quien entra con el código. La prueba se usa una sola vez por persona: si ya la tuvo (salió del
 * gimnasio y vuelve a entrar, o cambia de gimnasio), conserva la fecha de fin de la que ya tuvo y no recibe otra.
 */
export function trialForJoin(previousTrialEndsAt: Date | null | undefined, now: Date = new Date()): Date {
  return previousTrialEndsAt ?? trialEndsFrom(now);
}

/** Cómo se muestra el código al compartirlo: texto para mandar por WhatsApp o redes. */
export function shareCodeText(args: { gymName: string; code: string; url: string }): string {
  return `Entrená con ${args.gymName} en Forza AI 💪\n\nDescargá la app Forza AI en el App Store (o entrá a ${args.url}), creá tu cuenta, andá a Ajustes → Gimnasio e ingresá el código ${args.code}. Probás todo gratis ${GYM_TRIAL_DAYS} días.`;
}
