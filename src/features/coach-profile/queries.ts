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
  const hp: string[] = [];
  if (h.conditions.length) hp.push(`condiciones: ${list(h.conditions)}`);
  if (h.painAreas.length) hp.push(`molestias bajo carga: ${list(h.painAreas)}`);
  if (h.pregnancy && h.pregnancy !== 'no') hp.push(lab(h.pregnancy));
  if (h.sleepQuality) hp.push(`sueño ${lab(h.sleepQuality)}`);
  if (h.stressLevel) hp.push(`estrés ${lab(h.stressLevel)}`);
  if (h.note) hp.push(`nota: ${h.note}`);
  if (hp.length) out.push(`  Salud: ${hp.join('; ')}.`);

  // --- comida ---
  const f = cp.food;
  const fp: string[] = [];
  if (f.dietStyle) fp.push(`estilo ${lab(f.dietStyle)}`);
  if (f.favoriteFoods.length) fp.push(`le gusta: ${f.favoriteFoods.join(', ')}`);
  if (f.dislikedFoods.length) fp.push(`NO come: ${f.dislikedFoods.join(', ')}`);
  if (f.cookingSkill) fp.push(`cocina: ${lab(f.cookingSkill)}`);
  if (f.cookingTime) fp.push(`tiempo para cocinar: ${lab(f.cookingTime)}`);
  if (f.budget) fp.push(`presupuesto ${lab(f.budget)}`);
  if (f.eatingOut) fp.push(`come afuera ${lab(f.eatingOut)}`);
  if (f.supplements.length) fp.push(`suplementos: ${list(f.supplements)}`);
  if (f.hungriestTime) fp.push(`más hambre ${lab(f.hungriestTime)}`);
  if (f.hasScale) {
    fp.push(
      f.hasScale === 'si'
        ? 'tiene balanza de cocina (puede pesar la comida)'
        : 'NO tiene balanza (dale medidas caseras, no gramos que tenga que pesar)',
    );
  }
  if (f.nonNegotiables) fp.push(`no negocia: ${f.nonNegotiables}`);
  if (fp.length) out.push(`  Comida: ${fp.join('; ')}.`);

  // --- entrenamiento ---
  const tr = cp.training;
  const tp: string[] = [];
  if (tr.musclePriorities.length) tp.push(`priorizar: ${list(tr.musclePriorities)}`);
  if (tr.dislikedExercises.length) tp.push(`NO hacer: ${tr.dislikedExercises.join(', ')}`);
  if (tr.techniqueLevel) tp.push(`técnica en básicos: ${lab(tr.techniqueLevel)}`);
  {
    const marks: string[] = [];
    if (tr.squatKg) marks.push(`sentadilla ${tr.squatKg}`);
    if (tr.deadliftKg) marks.push(`peso muerto ${tr.deadliftKg}`);
    if (tr.benchKg) marks.push(`banca ${tr.benchKg}`);
    if (marks.length) tp.push(`marcas aprox: ${marks.join(', ')} kg`);
  }
  if (tr.homeEquipment.length) tp.push(`equipo: ${list(tr.homeEquipment)}`);
  if (tr.cardioAttitude) tp.push(`cardio: ${lab(tr.cardioAttitude)}`);
  if (tr.cardioTypes.length) tp.push(`cardio preferido: ${list(tr.cardioTypes)}`);
  if (tr.jobActivity) tp.push(`trabajo: ${lab(tr.jobActivity)}`);
  if (tr.routineStyle) tp.push(`prefiere: ${lab(tr.routineStyle)}`);
  if (tr.sportPriority) tp.push(`prioridad deporte vs. gimnasio: ${lab(tr.sportPriority)}`);
  if (tr.trainsSportAlone) {
    tp.push(`entrena su deporte ${tr.trainsSportAlone === 'solo' ? 'solo' : 'acompañado'}`);
  }
  if (tp.length) out.push(`  Entrenamiento: ${tp.join('; ')}.`);

  // --- objetivo ---
  const g = cp.goal;
  const gp: string[] = [];
  if (g.goalInWords) gp.push(`en sus palabras: "${g.goalInWords}"`);
  if (g.targetEvent || g.targetEventDate) {
    gp.push(
      `evento objetivo: ${[g.targetEvent, g.targetEventDate].filter(Boolean).join(' ')}`.trim(),
    );
  }
  if (g.aggressiveness) gp.push(`ritmo: ${lab(g.aggressiveness)}`);
  if (g.mainPriority) gp.push(`prioridad: ${lab(g.mainPriority)}`);
  if (g.triedBefore) gp.push(`antes probó (no funcionó): ${g.triedBefore}`);
  if (g.physiqueNote) gp.push(`físico (análisis previo): ${g.physiqueNote}`);
  if (gp.length) out.push(`  Objetivo: ${gp.join('; ')}.`);

  // --- día a día ---
  const ls = cp.lifestyle;
  const lp: string[] = [];
  if (ls.scheduleType) lp.push(`horario ${lab(ls.scheduleType)}`);
  if (ls.travelFrequency && ls.travelFrequency !== 'no')
    lp.push(`viaja por trabajo ${lab(ls.travelFrequency)}`);
  if (ls.caregiver === 'si') lp.push('tiene gente a cargo');
  if (ls.weekendDifferent === 'si') lp.push('el finde es muy distinto a la semana');
  if (ls.consistency) lp.push(`constancia histórica ${lab(ls.consistency)}`);
  if (ls.planFreedom) lp.push(`prefiere el plan ${lab(ls.planFreedom)}`);
  if (ls.adjustCadence) lp.push(`ajustar el plan ${lab(ls.adjustCadence)}`);
  if (lp.length) out.push(`  Día a día: ${lp.join('; ')}.`);

  if (out.length === 0) return [];
  return ['Preferencias del cliente (respetalas, nada genérico):', ...out];
}
