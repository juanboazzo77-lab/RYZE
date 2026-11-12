/**
 * Código del gimnasio para compartir: quien entra con el código usa todo gratis 3 días y después tiene que pagar su plan
 * (o escanear el QR del gimnasio y activarlo). Función pura. Copia de la de la app (src/features/gym/trial.ts).
 */

export const GYM_TRIAL_DAYS = 3;

/** Texto para mandar por WhatsApp o redes con el código del gimnasio. */
export function shareCodeText(args: { gymName: string; code: string; url: string }): string {
  return `Entrená con ${args.gymName} en Forza AI 💪\n\nDescargá la app Forza AI en el App Store (o entrá a ${args.url}), creá tu cuenta, andá a Ajustes → Gimnasio e ingresá el código ${args.code}. Probás todo gratis ${GYM_TRIAL_DAYS} días.`;
}

/** Cuántas personas entraron con el código: en prueba ahora y con la prueba terminada. */
export function codeStats(members: Array<{ trialEndsAt: Date | null }>, now: Date = new Date()): { total: number; inTrial: number; ended: number } {
  const inTrial = members.filter((m) => m.trialEndsAt !== null && m.trialEndsAt.getTime() > now.getTime()).length;
  return { total: members.length, inTrial, ended: members.length - inTrial };
}
