import type { MuscleGroup } from '@prisma/client';

/** Grupos que se muestran en el resumen semanal (sin "Otro": cardio/calentamiento). */
export const VOLUME_MUSCLES: MuscleGroup[] = [
  'CHEST',
  'BACK',
  'SHOULDERS',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'ABS',
  'TRAPS',
  'FULL_BODY',
];

export const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Palabras clave → grupo principal, para ejercicios que no están en la biblioteca. */
const PRIMARY_KEYWORDS: Array<[RegExp, MuscleGroup]> = [
  [/domina|jalon|remo|pull[- ]?up|espalda|dorsal|hiperextens|superman/, 'BACK'],
  [/press de banca|pecho|pectoral|apertura|cruce de polea|contractor|pec deck|flexion|fondos para pecho/, 'CHEST'],
  [/press militar|hombro|deltoid|elevacion(es)? (lateral|frontal)|arnold|pajaros|face pull|push press|pike/, 'SHOULDERS'],
  [/encogimiento|trapecio|paseo del granjero/, 'TRAPS'],
  [/curl de biceps|curl (con|en|martillo|concentrado|predicador|inclinado|arana)|biceps/, 'BICEPS'],
  [/triceps|extension de codo|press frances|patada de triceps|fondos en|press cerrado|diamante/, 'TRICEPS'],
  [/curl de muneca|antebrazo/, 'FOREARMS'],
  [/sentadilla|prensa|zancada|extension de cuadriceps|hack|squat|lunge|step[- ]?up|pistol|wall sit|sillon/, 'QUADS'],
  [/femoral|isquio|peso muerto rumano|nordico|hamstring|piernas rigidas/, 'HAMSTRINGS'],
  [/hip thrust|gluteo|puente de gluteo|patada de gluteo|abduccion|aductor|pull-through/, 'GLUTES'],
  [/gemelo|pantorrilla|talon|calf|soleo/, 'CALVES'],
  [/abdominal|plancha|crunch|core|rueda abdominal|elevacion de (piernas|rodillas)|russian|mountain|dead bug|hollow|pallof|lenador/, 'ABS'],
  [/peso muerto|deadlift|buenos dias/, 'BACK'],
];

export function guessPrimary(name: string): MuscleGroup {
  const n = normalizeName(name);
  for (const [re, m] of PRIMARY_KEYWORDS) if (re.test(n)) return m;
  return 'OTHER';
}

/** Músculos secundarios habituales según el patrón de movimiento. */
export function inferSecondary(name: string, primary: MuscleGroup): MuscleGroup[] {
  const n = normalizeName(name);
  switch (primary) {
    case 'CHEST':
      return /apertura|cruce|contractor|pec deck|pullover/.test(n) ? [] : ['TRICEPS', 'SHOULDERS'];
    case 'BACK':
      if (/peso muerto|buenos dias|hiperextens|superman/.test(n)) return ['GLUTES', 'HAMSTRINGS'];
      if (/pullover/.test(n)) return [];
      return /remo/.test(n) ? ['BICEPS', 'TRAPS'] : ['BICEPS'];
    case 'SHOULDERS':
      if (/press|arnold|pike/.test(n)) return ['TRICEPS'];
      if (/face pull|mentón|menton|pajaros/.test(n)) return ['TRAPS'];
      return [];
    case 'TRAPS':
      return /granjero/.test(n) ? ['FOREARMS'] : [];
    case 'BICEPS':
      return ['FOREARMS'];
    case 'TRICEPS':
      return /press cerrado|fondos|diamante/.test(n) ? ['CHEST', 'SHOULDERS'] : [];
    case 'QUADS':
      return /extension de cuadriceps|wall sit|sillon/.test(n) ? [] : ['GLUTES'];
    case 'HAMSTRINGS':
      return /peso muerto|buenos dias/.test(n) ? ['GLUTES', 'BACK'] : [];
    case 'GLUTES':
      if (/hip thrust|puente|pull-through/.test(n)) return ['HAMSTRINGS'];
      if (/sumo|lateral/.test(n)) return ['QUADS', 'HAMSTRINGS'];
      return [];
    default:
      return [];
  }
}

export interface VolumeItem {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  sets: number;
  /** El cardio y los calentamientos no cuentan como series de fuerza. */
  countable: boolean;
}

export interface VolumeRow {
  muscle: MuscleGroup;
  /** Series (por semana) donde el grupo es el músculo principal. */
  primarySets: number;
  primaryExercises: number;
  /** Series (por semana) donde el grupo participa como secundario. */
  secondarySets: number;
  secondaryExercises: number;
}

/** Series semanales por grupo muscular, separando principal y secundario. */
export function summarizeVolume(items: VolumeItem[]): VolumeRow[] {
  const rows = new Map<MuscleGroup, VolumeRow>();
  const row = (muscle: MuscleGroup): VolumeRow => {
    let r = rows.get(muscle);
    if (!r) {
      r = { muscle, primarySets: 0, primaryExercises: 0, secondarySets: 0, secondaryExercises: 0 };
      rows.set(muscle, r);
    }
    return r;
  };

  for (const it of items) {
    if (!it.countable || it.sets <= 0 || !VOLUME_MUSCLES.includes(it.primary)) continue;
    const p = row(it.primary);
    p.primarySets += it.sets;
    p.primaryExercises += 1;
    for (const m of new Set(it.secondary)) {
      if (m === it.primary || !VOLUME_MUSCLES.includes(m)) continue;
      const s = row(m);
      s.secondarySets += it.sets;
      s.secondaryExercises += 1;
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      b.primarySets + b.secondarySets - (a.primarySets + a.secondarySets) ||
      VOLUME_MUSCLES.indexOf(a.muscle) - VOLUME_MUSCLES.indexOf(b.muscle),
  );
}
