import { z } from 'zod';

/**
 * Perfil de coaching: preferencias del cliente para individualizar dieta y
 * entrenamiento. 5 secciones, todo opcional. Los valores son slugs estables
 * (ASCII); las etiquetas visibles salen del diccionario i18n.
 */

export const SECTION_KEYS = ['health', 'food', 'training', 'goal', 'lifestyle'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

// ---------------------------------------------------------------------------
// Catálogos de opciones
// ---------------------------------------------------------------------------

export const HEALTH_CONDITIONS = [
  'hipertension',
  'colesterol',
  'diabetes',
  'tiroides',
  'celiaquia',
  'colon_irritable',
  'reflujo',
  'higado_graso',
  'sop',
  'apnea',
  'ninguna',
] as const;
export const PAIN_AREAS = [
  'rodillas',
  'hombros',
  'lumbar',
  'cuello',
  'munecas',
  'codos',
  'cadera',
  'tobillos',
  'ninguna',
] as const;
export const PREGNANCY = ['no', 'embarazo', 'posparto', 'lactancia'] as const;
export const QUALITY_3 = ['mala', 'regular', 'buena'] as const;
export const LEVEL_3 = ['bajo', 'medio', 'alto'] as const;
export const YES_NO = ['si', 'no'] as const;

export const DIET_STYLES = [
  'omnivoro',
  'vegetariano',
  'vegano',
  'pescetariano',
  'keto',
  'halal',
  'kosher',
] as const;
export const COOKING_SKILL = ['no_cocino', 'basico', 'me_defiendo', 'cocino_bien'] as const;
export const COOKING_TIME = ['minimo', 'quince', 'treinta', 'sin_problema'] as const;
export const BUDGET = ['ajustado', 'normal', 'holgado'] as const;
export const EATING_OUT = ['casi_nunca', 'semanal', 'diario'] as const;
export const SUPPLEMENTS = [
  'proteina',
  'creatina',
  'cafeina',
  'omega3',
  'vitamina_d',
  'electrolitos',
  'multivitaminico',
  'ninguno',
] as const;
export const DAYTIME = ['manana', 'tarde', 'noche', 'todo_el_dia'] as const;

export const MUSCLE_PRIORITIES = [
  'pecho',
  'espalda',
  'hombros',
  'brazos',
  'gluteos',
  'piernas',
  'abdomen',
  'fuerza_general',
] as const;
export const TECHNIQUE_LEVEL = ['cero', 'algo', 'bien', 'muy_bien'] as const;
export const HOME_EQUIPMENT = [
  'mancuernas',
  'barra',
  'rack',
  'poleas',
  'maquinas',
  'kettlebells',
  'bandas',
  'dominadas',
  'solo_peso',
] as const;
export const CARDIO_ATTITUDE = ['lo_odio', 'si_hace_falta', 'me_gusta'] as const;
export const CARDIO_TYPES = [
  'caminar',
  'trotar',
  'bici',
  'eliptica',
  'remo',
  'natacion',
  'cuerda',
] as const;
export const JOB_ACTIVITY = ['sentado', 'mixto', 'de_pie', 'fisico'] as const;
export const ROUTINE_STYLE = ['full_body', 'ppl', 'torso_pierna', 'que_decida_coach'] as const;

export const AGGRESSIVENESS = ['tranquilo', 'equilibrado', 'a_full'] as const;
export const MAIN_PRIORITY = ['estetica', 'salud', 'rendimiento', 'fuerza'] as const;

export const SCHEDULE_TYPE = ['normal', 'turnos', 'variable'] as const;
export const TRAVEL_FREQ = ['no', 'a_veces', 'seguido'] as const;
export const CONSISTENCY = ['baja', 'media', 'alta'] as const;
export const PLAN_FREEDOM = ['cerrado', 'algo_libre', 'flexible'] as const;
export const ADJUST_CADENCE = ['semanal', 'quincenal', 'cuando_haga_falta'] as const;

// ---------------------------------------------------------------------------
// Helpers de Zod tolerantes: datos guardados viejos nunca rompen la lectura.
// ---------------------------------------------------------------------------

type Slugs = readonly [string, ...string[]];
const optEnum = <T extends Slugs>(vals: T) =>
  z.enum(vals).nullable().default(null).catch(null);
const chips = <T extends Slugs>(vals: T) =>
  z
    .array(z.enum(vals))
    .transform((xs) => [...new Set(xs)])
    .default([])
    .catch([]);
const tags = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .transform((xs) => [...new Set(xs)])
  .default([])
  .catch([]);
const note = (max = 300) => z.string().trim().max(max).default('').catch('');

/**
 * Chips con un valor "ninguno/a" mutuamente excluyente: elegirlo saca el resto,
 * elegir cualquier otro saca "ninguno/a". Para usar en el `onChange` de un
 * `ChipMulti` que incluya ese valor en su catálogo.
 */
export function toggleNone<T extends string>(prev: T[], next: T[], none: T): T[] {
  const noneWasOn = prev.includes(none);
  const noneIsOn = next.includes(none);
  if (!noneWasOn && noneIsOn) return [none];
  if (noneWasOn && next.length > 1) return next.filter((v) => v !== none);
  return next;
}
const kgOpt = z.coerce.number().int().min(0).max(500).nullable().default(null).catch(null);
const dateOpt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .default(null)
  .catch(null);

// ---------------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------------

export const healthSchema = z.object({
  conditions: chips(HEALTH_CONDITIONS),
  painAreas: chips(PAIN_AREAS),
  pregnancy: optEnum(PREGNANCY),
  sleepQuality: optEnum(QUALITY_3),
  stressLevel: optEnum(LEVEL_3),
  note: note(),
});

export const foodSchema = z.object({
  dietStyle: optEnum(DIET_STYLES),
  favoriteFoods: tags,
  dislikedFoods: tags,
  cookingSkill: optEnum(COOKING_SKILL),
  cookingTime: optEnum(COOKING_TIME),
  budget: optEnum(BUDGET),
  eatingOut: optEnum(EATING_OUT),
  supplements: chips(SUPPLEMENTS),
  hungriestTime: optEnum(DAYTIME),
  hasScale: optEnum(YES_NO),
  nonNegotiables: note(),
});

export const trainingSchema = z.object({
  dislikedExercises: tags,
  musclePriorities: chips(MUSCLE_PRIORITIES),
  techniqueLevel: optEnum(TECHNIQUE_LEVEL),
  squatKg: kgOpt,
  deadliftKg: kgOpt,
  benchKg: kgOpt,
  homeEquipment: chips(HOME_EQUIPMENT),
  cardioAttitude: optEnum(CARDIO_ATTITUDE),
  cardioTypes: chips(CARDIO_TYPES),
  jobActivity: optEnum(JOB_ACTIVITY),
  routineStyle: optEnum(ROUTINE_STYLE),
});

export const goalSchema = z.object({
  goalInWords: note(600),
  targetEvent: note(120),
  targetEventDate: dateOpt,
  aggressiveness: optEnum(AGGRESSIVENESS),
  mainPriority: optEnum(MAIN_PRIORITY),
  triedBefore: note(),
});

export const lifestyleSchema = z.object({
  scheduleType: optEnum(SCHEDULE_TYPE),
  travelFrequency: optEnum(TRAVEL_FREQ),
  caregiver: optEnum(YES_NO),
  weekendDifferent: optEnum(YES_NO),
  consistency: optEnum(CONSISTENCY),
  planFreedom: optEnum(PLAN_FREEDOM),
  adjustCadence: optEnum(ADJUST_CADENCE),
});

export const SECTION_SCHEMAS = {
  health: healthSchema,
  food: foodSchema,
  training: trainingSchema,
  goal: goalSchema,
  lifestyle: lifestyleSchema,
} as const;

export type HealthSection = z.infer<typeof healthSchema>;
export type FoodSection = z.infer<typeof foodSchema>;
export type TrainingSection = z.infer<typeof trainingSchema>;
export type GoalSection = z.infer<typeof goalSchema>;
export type LifestyleSection = z.infer<typeof lifestyleSchema>;

export interface CoachProfileData {
  health: HealthSection;
  food: FoodSection;
  training: TrainingSection;
  goal: GoalSection;
  lifestyle: LifestyleSection;
}

/**
 * Payload de la Server Action. El formulario siempre manda las 5 secciones
 * completas (con sus defaults), así el guardado es un único upsert. Una sección
 * ausente se toma como vacía.
 */
export const saveCoachProfileSchema = z.object({
  health: healthSchema.default({}),
  food: foodSchema.default({}),
  training: trainingSchema.default({}),
  goal: goalSchema.default({}),
  lifestyle: lifestyleSchema.default({}),
});
export type SaveCoachProfileInput = z.infer<typeof saveCoachProfileSchema>;

/** Devuelve una sección completa con todos sus defaults. */
export function emptySection<K extends SectionKey>(key: K): CoachProfileData[K] {
  return SECTION_SCHEMAS[key].parse({}) as CoachProfileData[K];
}

export function emptyCoachProfile(): CoachProfileData {
  return {
    health: emptySection('health'),
    food: emptySection('food'),
    training: emptySection('training'),
    goal: emptySection('goal'),
    lifestyle: emptySection('lifestyle'),
  };
}

/** Parsea un valor JSON crudo de la DB a una sección válida (nunca tira). */
export function parseSection<K extends SectionKey>(key: K, raw: unknown): CoachProfileData[K] {
  const res = SECTION_SCHEMAS[key].safeParse(raw ?? {});
  return (res.success ? res.data : SECTION_SCHEMAS[key].parse({})) as CoachProfileData[K];
}

// ---------------------------------------------------------------------------
// Completitud del perfil (para la barra de progreso y el nudge)
// ---------------------------------------------------------------------------

/** Campos que "cuentan" para el % de cada sección (los de toque rápido). */
export const COMPLETION_FIELDS: Record<SectionKey, string[]> = {
  health: ['conditions', 'painAreas', 'sleepQuality', 'stressLevel'],
  food: [
    'dietStyle',
    'favoriteFoods',
    'dislikedFoods',
    'cookingSkill',
    'cookingTime',
    'budget',
    'eatingOut',
    'supplements',
    'hungriestTime',
    'hasScale',
  ],
  training: [
    'musclePriorities',
    'techniqueLevel',
    'homeEquipment',
    'cardioAttitude',
    'jobActivity',
    'routineStyle',
  ],
  goal: ['goalInWords', 'aggressiveness', 'mainPriority'],
  lifestyle: ['scheduleType', 'travelFrequency', 'consistency', 'planFreedom', 'adjustCadence'],
};

function isFilled(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return v !== null && v !== undefined;
}

export interface CompletionResult {
  pct: number;
  perSection: Record<SectionKey, { done: number; total: number }>;
}

export function coachProfileCompletion(data: CoachProfileData): CompletionResult {
  const perSection = {} as CompletionResult['perSection'];
  let done = 0;
  let total = 0;
  for (const key of SECTION_KEYS) {
    const fields = COMPLETION_FIELDS[key];
    const section = data[key] as Record<string, unknown>;
    const d = fields.filter((f) => isFilled(section[f])).length;
    perSection[key] = { done: d, total: fields.length };
    done += d;
    total += fields.length;
  }
  return { pct: total === 0 ? 0 : Math.round((done / total) * 100), perSection };
}
