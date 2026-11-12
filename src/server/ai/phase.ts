/**
 * Fase nutricional del usuario (definición, volumen, mantenimiento o recomposición) y la carga de su semana (fuerza +
 * deportes). Se le pasa a la IA para que la rutina y la dieta se armen JUNTAS: no es el mismo entrenamiento en definición
 * que en volumen, ni con fútbol que con tenis, y la comida de un día de deporte no es la de un día de descanso.
 * Funciones puras (sin base de datos).
 */

export type NutritionPhase = 'CUT' | 'BULK' | 'MAINTAIN' | 'RECOMP';

/** Fase a partir del objetivo del usuario y, si lo hay, de su meta de peso. null = todavía no se sabe. */
export function nutritionPhase(args: { goalType?: string | null; primaryGoal?: string | null; weeklyRateKg?: number | null }): NutritionPhase | null {
  const type = args.goalType ?? args.primaryGoal ?? null;
  if (type === 'LOSE_FAT') return 'CUT';
  if (type === 'GAIN_MUSCLE') return 'BULK';
  if (type === 'RECOMP') return 'RECOMP';
  if (type === 'MAINTAIN' || type === 'STRENGTH' || type === 'PERFORMANCE') {
    // Un ritmo de peso marcado manda sobre la etiqueta (por ejemplo, fuerza pero con la meta de subir de peso).
    const r = args.weeklyRateKg;
    if (typeof r === 'number' && r <= -0.15) return 'CUT';
    if (typeof r === 'number' && r >= 0.15) return 'BULK';
    return 'MAINTAIN';
  }
  return null;
}

const PHASE_LINES: Record<NutritionPhase, string[]> = {
  CUT: [
    'Fase nutricional: DEFINICIÓN (déficit calórico).',
    '  Entrenamiento en esta fase: mantener la intensidad y las cargas (eso protege el músculo), pero el volumen en la parte baja-media del rango; priorizar básicos y sacar series de relleno; más descanso entre días duros; la fatiga se acumula más rápido con poca comida, así que no sumar cardio ni deporte intenso sobre una rutina ya cargada.',
    '  Alimentación en esta fase: proteína alta (2,0-2,4 g/kg), calorías con tope firme, carbohidratos concentrados alrededor del entrenamiento y del deporte, mucha saciedad (verduras, fibra, proteína).',
  ],
  BULK: [
    'Fase nutricional: VOLUMEN (superávit calórico).',
    '  Entrenamiento en esta fase: volumen en la parte media-alta del rango, progresión de cargas semana a semana, buena frecuencia por grupo muscular y descansos completos entre series pesadas; se banca más trabajo porque la recuperación está respaldada por la comida.',
    '  Alimentación en esta fase: superávit moderado (sin engordar de más), proteína 1,6-2,2 g/kg, más carbohidratos para sostener el volumen, y que los días de más entrenamiento y deporte sean los de más comida.',
  ],
  MAINTAIN: [
    'Fase nutricional: MANTENIMIENTO (calorías cerca del gasto).',
    '  Entrenamiento en esta fase: volumen medio y progresión sostenida; sirve para fuerza y rendimiento.',
    '  Alimentación en esta fase: calorías de mantenimiento, proteína adecuada y carbohidratos según la carga del día.',
  ],
  RECOMP: [
    'Fase nutricional: RECOMPOSICIÓN (calorías cerca del mantenimiento, ganar músculo y perder grasa a la vez).',
    '  Entrenamiento en esta fase: fuerza progresiva con volumen medio-alto y buen descanso; calorías algo más altas los días de entrenamiento duro y algo más bajas los de descanso.',
    '  Alimentación en esta fase: proteína alta (2,0-2,4 g/kg) repartida en el día y carbohidratos concentrados en torno al entrenamiento.',
  ],
};

/** Líneas de contexto para la IA con la fase nutricional y lo que implica para el entrenamiento y la comida. */
export function phaseContextLines(phase: NutritionPhase | null): string[] {
  return phase ? PHASE_LINES[phase] : [];
}

export interface SportLoad {
  name: string;
  sessionsPerWeek: number;
  /** Días de la semana ISO (1 = lunes … 7 = domingo). */
  sessionDays: number[];
}

const WEEKDAY_NAMES = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/**
 * La carga de la semana y de HOY: cuántos días de fuerza y qué deportes (y si hoy hay uno), para que la IA reparta la
 * comida según el día (más carbohidratos con deporte o entrenamiento duro, menos en descanso).
 */
export function weekLoadContextLines(args: { gymDaysPerWeek: number | null; sports: SportLoad[]; todayWeekday: number }): string[] {
  const lines: string[] = [];
  const today = WEEKDAY_NAMES[args.todayWeekday] ?? '';
  const sportsToday = args.sports.filter((s) => s.sessionDays.includes(args.todayWeekday)).map((s) => s.name);
  const totalSport = args.sports.reduce((a, s) => a + (s.sessionsPerWeek || 0), 0);
  lines.push(
    `Carga de la semana: ${args.gymDaysPerWeek ?? '—'} días de fuerza + ${totalSport} sesiones de deporte${args.sports.length ? ` (${args.sports.map((s) => s.name).join(', ')})` : ''}.`,
  );
  lines.push(
    `Hoy es ${today}: ${sportsToday.length > 0 ? `tiene deporte hoy (${sportsToday.join(', ')}); es un día de más gasto` : 'no tiene deporte cargado para hoy'}.`,
  );
  return lines;
}
