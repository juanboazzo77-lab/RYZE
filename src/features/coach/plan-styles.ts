/** Tipos de rutina que el usuario puede elegir al generar un plan con IA. */
export const PLAN_STYLES = [
  'coach',
  'full_body',
  'upper_lower',
  'ppl',
  'ppl_upper_lower',
  'arnold',
  'bro_split',
  'strength',
] as const;
export type PlanStyle = (typeof PLAN_STYLES)[number];

/** Rango de días por semana en los que cada estilo tiene sentido. */
const STYLE_DAYS: Record<PlanStyle, readonly [number, number]> = {
  coach: [1, 7],
  full_body: [1, 4],
  upper_lower: [2, 6],
  ppl: [3, 6],
  ppl_upper_lower: [5, 5],
  arnold: [3, 6],
  bro_split: [4, 6],
  strength: [2, 5],
};

export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const;

export function stylesForDays(days: number): PlanStyle[] {
  return PLAN_STYLES.filter((s) => days >= STYLE_DAYS[s][0] && days <= STYLE_DAYS[s][1]);
}

/** Descripción del estilo para el prompt de la IA. */
export const STYLE_PROMPT: Record<PlanStyle, string> = {
  coach: 'elegí vos el tipo de rutina que mejor encaje con su perfil',
  full_body: 'cuerpo completo (full body) en cada sesión',
  upper_lower: 'torso / pierna (upper/lower) alternando',
  ppl: 'empuje / tirón / pierna (push/pull/legs)',
  ppl_upper_lower: 'empuje / tirón / pierna combinado con torso / pierna (5 días)',
  arnold: 'split Arnold: pecho + espalda, hombros + brazos, piernas',
  bro_split: 'un grupo muscular principal por día',
  strength:
    'fuerza: básicos pesados (sentadilla, peso muerto, press) con pocas repeticiones y accesorios',
};
