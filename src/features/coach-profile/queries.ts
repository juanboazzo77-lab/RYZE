import 'server-only';
import type { Profile } from '@prisma/client';
import { forUser } from '@/server/user-db';
import {
  coachProfileCompletion,
  emptyCoachProfile,
  parseSection,
  type CoachProfileData,
  type CompletionResult,
} from './schema';

/** Perfil de coaching del usuario, con defaults si todavía no cargó nada. */
export async function getCoachProfile(profile: Profile): Promise<CoachProfileData> {
  const db = forUser(profile.id);
  const row = await db.coachProfile.findFirst({});
  if (!row) return emptyCoachProfile();
  return {
    health: parseSection('health', row.health),
    food: parseSection('food', row.food),
    training: parseSection('training', row.training),
    goal: parseSection('goal', row.goal),
    lifestyle: parseSection('lifestyle', row.lifestyle),
  };
}

export async function getCoachProfileCompletion(profile: Profile): Promise<CompletionResult> {
  return coachProfileCompletion(await getCoachProfile(profile));
}

// ---------------------------------------------------------------------------
// Bloque de texto para el contexto del AI Coach / generadores de plan.
// Etiquetas en español (el contexto del modelo es en español).
// ---------------------------------------------------------------------------

const L: Record<string, string> = {
  // salud
  hipertension: 'hipertensión',
  colesterol: 'colesterol alto',
  diabetes: 'diabetes / resistencia a la insulina',
  tiroides: 'tiroides',
  celiaquia: 'celiaquía',
  colon_irritable: 'colon irritable',
  reflujo: 'reflujo',
  higado_graso: 'hígado graso',
  sop: 'SOP',
  apnea: 'apnea del sueño',
  rodillas: 'rodillas',
  hombros: 'hombros',
  lumbar: 'zona lumbar',
  cuello: 'cuello',
  munecas: 'muñecas',
  codos: 'codos',
  cadera: 'cadera',
  tobillos: 'tobillos',
  embarazo: 'embarazo',
  posparto: 'posparto',
  lactancia: 'lactancia',
  mala: 'malo',
  regular: 'regular',
  buena: 'bueno',
  bajo: 'bajo',
  medio: 'medio',
  alto: 'alto',
  // comida
  omnivoro: 'omnívoro',
  vegetariano: 'vegetariano',
  vegano: 'vegano',
  pescetariano: 'pescetariano',
  keto: 'keto',
  halal: 'halal',
  kosher: 'kosher',
  no_cocino: 'no cocina',
  basico: 'básico',
  me_defiendo: 'se defiende',
  cocino_bien: 'cocina bien',
  minimo: 'casi nada',
  quince: '15 min',
  treinta: '30 min',
  sin_problema: 'sin problema',
  ajustado: 'ajustado',
  normal: 'normal',
  holgado: 'holgado',
  casi_nunca: 'casi nunca',
  semanal: '1-2 por semana',
  diario: 'casi a diario',
  proteina: 'proteína',
  creatina: 'creatina',
  cafeina: 'cafeína',
  omega3: 'omega-3',
  vitamina_d: 'vitamina D',
  electrolitos: 'electrolitos',
  multivitaminico: 'multivitamínico',
  manana: 'a la mañana',
  tarde: 'a la tarde',
  noche: 'a la noche',
  todo_el_dia: 'todo el día',
  // entrenamiento
  pecho: 'pecho',
  espalda: 'espalda',
  brazos: 'brazos',
  gluteos: 'glúteos',
  piernas: 'piernas',
  abdomen: 'abdomen',
  fuerza_general: 'fuerza general',
  cero: 'nula',
  algo: 'algo',
  bien: 'buena',
  muy_bien: 'muy buena',
  mancuernas: 'mancuernas',
  barra: 'barra y discos',
  rack: 'rack',
  poleas: 'poleas',
  maquinas: 'máquinas',
  kettlebells: 'kettlebells',
  bandas: 'bandas',
  dominadas: 'barra de dominadas',
  solo_peso: 'solo peso corporal',
  lo_odio: 'lo odia',
  si_hace_falta: 'lo hace si hace falta',
  me_gusta: 'le gusta',
  caminar: 'caminar',
  trotar: 'trotar',
  bici: 'bici',
  eliptica: 'elíptica',
  remo: 'remo',
  natacion: 'natación',
  cuerda: 'cuerda',
  sentado: 'sentado todo el día',
  mixto: 'mixto',
  de_pie: 'de pie',
  fisico: 'trabajo físico',
  full_body: 'full body',
  ppl: 'empuje/tirón/pierna',
  torso_pierna: 'torso/pierna',
  que_decida_coach: 'que decida el coach',
  // objetivo
  tranquilo: 'tranquilo y sostenible',
  equilibrado: 'equilibrado',
  a_full: 'agresivo (a full)',
  estetica: 'estética / verse mejor',
  salud: 'salud',
  rendimiento: 'rendimiento',
  fuerza: 'fuerza',
  // día a día
  turnos: 'turnos rotativos',
  variable: 'muy variable',
  a_veces: 'a veces',
  seguido: 'seguido',
  baja: 'baja',
  media: 'media',
  cerrado: 'todo cerrado',
  algo_libre: 'con algo de libertad',
  flexible: 'flexible',
  quincenal: 'cada 2 semanas',
  cuando_haga_falta: 'cuando haga falta',
};

const WEEKDAY_NAME = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const TRAINING_YEARS_LABEL = {
  menos_6m: 'menos de 6 meses',
  de_6m_a_1a: '6 meses a 1 año',
  de_1_a_3a: '1 a 3 años',
  mas_de_3a: 'más de 3 años',
} as const;
const CURRENT_SPLIT_LABEL = {
  ninguno: 'no tiene rutina (recién empieza)',
  full_body: 'full body',
  ppl: 'empuje / tirón / pierna',
  torso_pierna: 'torso / pierna',
  por_grupo: 'un grupo muscular por día',
} as const;
const GYM_MACHINES_LABEL = {
  prensa: 'prensa de piernas',
  hack: 'hack squat',
  smith: 'máquina Smith',
  poleas: 'poleas',
  barra_libre: 'barra libre y rack',
  mancuernas_pesadas: 'mancuernas pesadas',
  maquinas_guiadas: 'máquinas guiadas',
  dominadas: 'barra de dominadas',
} as const;
const REP_PREFERENCE_LABEL = {
  pesadas: 'pesadas (4-8)',
  medias: 'medias (8-12)',
  altas: 'altas (12-20)',
  mixto: 'un poco de todo',
} as const;
const WARMUP_LABEL = {
  completo: 'completo (~10 min)',
  corto: 'corto (~5 min)',
  ninguno: 'no lo quiere (no lo incluyas)',
} as const;
const MOBILITY_LABEL = {
  si: 'sí, incluilo',
  a_veces: 'a veces (poco volumen)',
  no: 'no lo quiere',
} as const;
const SPORT_SEASON_LABEL = {
  pretemporada: 'pretemporada (más base y volumen)',
  en_competencia: 'en competencia (bajá el volumen de piernas, priorizá frescura)',
  descanso: 'descanso / fuera de temporada (más gimnasio)',
  sin_temporada: 'su deporte no tiene temporada',
} as const;

const lab = (v: string | null): string => (v ? (L[v] ?? v.replace(/_/g, ' ')) : '');
const list = (xs: string[]): string => xs.map((x) => L[x] ?? x.replace(/_/g, ' ')).join(', ');

/**
 * Preferencias del cliente para el contexto del modelo. Sólo incluye lo cargado;
 * vacío si el perfil de coaching está sin tocar.
 */
export async function buildCoachProfileLines(profile: Profile): Promise<string[]> {
  const cp = await getCoachProfile(profile);
  const out: string[] = [];

  // --- salud ---
  const h = cp.health;
  if (h.conditions.length) out.push(`  Condiciones de salud: ${list(h.conditions)}`);
  if (h.painAreas.length) out.push(`  Molestias bajo carga: ${list(h.painAreas)}`);
  if (h.pregnancy && h.pregnancy !== 'no') out.push(`  Situación: ${lab(h.pregnancy)}`);
  if (h.sleepQuality) out.push(`  Calidad de sueño: ${lab(h.sleepQuality)}`);
  if (h.stressLevel) out.push(`  Nivel de estrés: ${lab(h.stressLevel)}`);
  if (h.note) out.push(`  Nota de salud: ${h.note}`);

  // --- comida ---
  const f = cp.food;
  if (f.dietStyle) out.push(`  Estilo de dieta: ${lab(f.dietStyle)}`);
  if (f.favoriteFoods.length) out.push(`  Comidas que le gustan: ${f.favoriteFoods.join(', ')}`);
  if (f.dislikedFoods.length) out.push(`  Comidas que NO come: ${f.dislikedFoods.join(', ')}`);
  if (f.cookingSkill) out.push(`  Nivel de cocina: ${lab(f.cookingSkill)}`);
  if (f.cookingTime) out.push(`  Tiempo disponible para cocinar: ${lab(f.cookingTime)}`);
  if (f.budget) out.push(`  Presupuesto para comida: ${lab(f.budget)}`);
  if (f.eatingOut) out.push(`  Frecuencia de comer afuera: ${lab(f.eatingOut)}`);
  if (f.supplements.length) out.push(`  Suplementos que toma: ${list(f.supplements)}`);
  if (f.hungriestTime) out.push(`  Momento de más hambre: ${lab(f.hungriestTime)}`);
  if (f.hasScale) {
    out.push(
      f.hasScale === 'si'
        ? '  Tiene balanza de cocina (puede pesar la comida).'
        : '  NO tiene balanza (dale medidas caseras, no gramos que tenga que pesar).',
    );
  }
  if (f.nonNegotiables) out.push(`  No negocia en la dieta: ${f.nonNegotiables}`);

  // --- entrenamiento ---
  const tr = cp.training;
  if (tr.musclePriorities.length) out.push(`  Grupos a priorizar (coach): ${list(tr.musclePriorities)}`);
  if (tr.dislikedExercises.length) out.push(`  Ejercicios que NO quiere hacer (coach): ${tr.dislikedExercises.join(', ')}`);
  if (tr.techniqueLevel) out.push(`  Nivel de técnica en básicos: ${lab(tr.techniqueLevel)}`);
  if (tr.squatKg) out.push(`  Marca aprox. sentadilla: ${tr.squatKg} kg`);
  if (tr.deadliftKg) out.push(`  Marca aprox. peso muerto: ${tr.deadliftKg} kg`);
  if (tr.benchKg) out.push(`  Marca aprox. banca: ${tr.benchKg} kg`);
  if (tr.homeEquipment.length) out.push(`  Equipo disponible (coach): ${list(tr.homeEquipment)}`);
  if (tr.cardioAttitude) out.push(`  Actitud frente al cardio: ${lab(tr.cardioAttitude)}`);
  if (tr.cardioTypes.length) out.push(`  Cardio preferido: ${list(tr.cardioTypes)}`);
  if (tr.jobActivity) out.push(`  Actividad en el trabajo: ${lab(tr.jobActivity)}`);
  if (tr.routineStyle) out.push(`  Estilo de rutina preferido (coach): ${lab(tr.routineStyle)}`);
  if (tr.sportPriority) out.push(`  Prioridad deporte vs. gimnasio (coach): ${lab(tr.sportPriority)}`);
  if (tr.trainsSportAlone) {
    out.push(`  Entrena su deporte: ${tr.trainsSportAlone === 'solo' ? 'solo' : 'acompañado'}`);
  }
  if (tr.trainDays.length) {
    out.push(
      `  Días de la semana en que PUEDE entrenar: ${tr.trainDays.map((n) => WEEKDAY_NAME[n - 1] ?? n).join(', ')} (armá los días de gimnasio sólo entre estos)`,
    );
  }
  if (tr.trainingYears) out.push(`  Tiempo entrenando de forma constante: ${TRAINING_YEARS_LABEL[tr.trainingYears]}`);
  if (tr.currentSplit) out.push(`  Cómo entrena hoy: ${CURRENT_SPLIT_LABEL[tr.currentSplit]}`);
  if (tr.gymMachines.length) {
    out.push(
      `  Equipamiento de su gimnasio: ${tr.gymMachines.map((m) => GYM_MACHINES_LABEL[m]).join(', ')} (usá sólo esto; no prescribas equipos que no figuren)`,
    );
  }
  if (tr.repPreference) out.push(`  Repeticiones que prefiere: ${REP_PREFERENCE_LABEL[tr.repPreference]}`);
  if (tr.restPreference) out.push(`  Descanso preferido entre series: ${tr.restPreference}`);
  if (tr.supersets === 'si') out.push('  Le gustan las superseries/circuitos para ahorrar tiempo.');
  if (tr.supersets === 'no') out.push('  NO quiere superseries ni circuitos.');
  if (tr.warmup) out.push(`  Calentamiento en la rutina: ${WARMUP_LABEL[tr.warmup]}`);
  if (tr.mobility) out.push(`  Trabajo de movilidad y prevención: ${MOBILITY_LABEL[tr.mobility]}`);
  if (tr.sportSeason) out.push(`  Momento de la temporada de su deporte: ${SPORT_SEASON_LABEL[tr.sportSeason]}`);
  if (tr.sportPrep === 'si') out.push('  Quiere calentamiento y movilidad específicos de su deporte.');

  // --- objetivo ---
  const g = cp.goal;
  if (g.goalInWords) out.push(`  En sus palabras, qué quiere lograr: "${g.goalInWords}"`);
  if (g.targetEvent || g.targetEventDate) {
    out.push(
      `  Evento objetivo: ${[g.targetEvent, g.targetEventDate].filter(Boolean).join(' ')}`.trim(),
    );
  }
  if (g.aggressiveness) out.push(`  Ritmo que quiere llevar: ${lab(g.aggressiveness)}`);
  if (g.mainPriority) out.push(`  Prioridad principal: ${lab(g.mainPriority)}`);
  if (g.triedBefore) out.push(`  Qué probó antes y no funcionó: ${g.triedBefore}`);
  if (g.physiqueNote) out.push(`  Análisis físico previo: ${g.physiqueNote}`);

  // --- día a día ---
  const ls = cp.lifestyle;
  if (ls.scheduleType) out.push(`  Tipo de horario laboral: ${lab(ls.scheduleType)}`);
  if (ls.travelFrequency && ls.travelFrequency !== 'no')
    out.push(`  Frecuencia de viajes por trabajo: ${lab(ls.travelFrequency)}`);
  if (ls.caregiver === 'si') out.push('  Tiene gente a cargo.');
  if (ls.weekendDifferent === 'si') out.push('  El fin de semana es muy distinto a la semana.');
  if (ls.consistency) out.push(`  Constancia histórica: ${lab(ls.consistency)}`);
  if (ls.planFreedom) out.push(`  Prefiere el plan: ${lab(ls.planFreedom)}`);
  if (ls.adjustCadence) out.push(`  Cada cuánto ajustar el plan: ${lab(ls.adjustCadence)}`);

  if (out.length === 0) return [];
  return ['Preferencias del cliente (respetalas, nada genérico):', ...out];
}
