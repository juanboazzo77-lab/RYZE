/**
 * Equipamiento y especialidad de un gimnasio. Lógica pura (sin base de datos). Se guarda en `gym.equipment`
 * como `{ items, notes, specialtyDetail }` y `gym.specialty` como una de las claves de SPECIALTIES.
 * Hay una copia de este archivo en admin-panel/src/features/gym/catalog.ts (el panel de gestión es un sitio
 * aparte): si cambia acá, cambiarlo allá también.
 */

export interface EquipmentItem {
  key: string;
  label: string;
}
export interface EquipmentGroup {
  key: string;
  label: string;
  items: EquipmentItem[];
}

export const EQUIPMENT_GROUPS: EquipmentGroup[] = [
  {
    key: 'free',
    label: 'Peso libre',
    items: [
      { key: 'barbell', label: 'Barras olímpicas y discos' },
      { key: 'dumbbells', label: 'Mancuernas' },
      { key: 'kettlebells', label: 'Kettlebells (pesas rusas)' },
      { key: 'squat_rack', label: 'Rack o jaula de sentadillas' },
      { key: 'bench_flat', label: 'Banco plano' },
      { key: 'bench_adjustable', label: 'Banco regulable (inclinado)' },
      { key: 'bench_decline', label: 'Banco declinado' },
      { key: 'preacher', label: 'Banco Scott (curl predicador)' },
      { key: 'hip_thrust', label: 'Banco o máquina de hip thrust' },
      { key: 'ez_bar', label: 'Barra Z' },
      { key: 'trap_bar', label: 'Barra hexagonal' },
    ],
  },
  {
    key: 'machines',
    label: 'Máquinas',
    items: [
      { key: 'leg_press', label: 'Prensa de piernas (45° u horizontal)' },
      { key: 'hack_squat', label: 'Hack squat' },
      { key: 'leg_extension', label: 'Extensión de cuádriceps' },
      { key: 'leg_curl', label: 'Curl femoral (acostado o sentado)' },
      { key: 'hip_abductor', label: 'Abductores y aductores' },
      { key: 'calf_machine', label: 'Gemelos (de pie o sentado)' },
      { key: 'chest_press', label: 'Press de pecho en máquina' },
      { key: 'pec_deck', label: 'Pec deck (aperturas)' },
      { key: 'shoulder_press', label: 'Press de hombros en máquina' },
      { key: 'lat_pulldown', label: 'Jalón al pecho' },
      { key: 'seated_row', label: 'Remo en máquina o polea baja' },
      { key: 'cable_crossover', label: 'Poleas dobles / crossover' },
      { key: 'smith', label: 'Máquina Smith o multipower' },
      { key: 'assisted_pullup', label: 'Dominadas asistidas' },
      { key: 'biceps_machine', label: 'Curl de bíceps en máquina' },
      { key: 'triceps_machine', label: 'Tríceps en máquina' },
      { key: 'ab_machine', label: 'Abdominales en máquina' },
      { key: 'back_extension', label: 'Banco romano o lumbares' },
    ],
  },
  {
    key: 'functional',
    label: 'Funcional y CrossFit',
    items: [
      { key: 'pullup_bar', label: 'Barras de dominadas' },
      { key: 'rings', label: 'Anillas' },
      { key: 'plyo_box', label: 'Cajones de salto' },
      { key: 'battle_ropes', label: 'Sogas de batalla' },
      { key: 'sled', label: 'Trineo' },
      { key: 'medicine_ball', label: 'Pelotas medicinales / wall ball' },
      { key: 'trx', label: 'TRX o suspensión' },
      { key: 'landmine', label: 'Landmine' },
      { key: 'heavy_bag', label: 'Bolsa de boxeo' },
      { key: 'rower', label: 'Remo ergómetro' },
      { key: 'assault_bike', label: 'Assault bike' },
      { key: 'ski_erg', label: 'Ski erg' },
    ],
  },
  {
    key: 'cardio',
    label: 'Cardio',
    items: [
      { key: 'treadmill', label: 'Cintas de correr' },
      { key: 'bike', label: 'Bicicletas fijas' },
      { key: 'elliptical', label: 'Elípticas' },
      { key: 'stair_climber', label: 'Escaladora' },
      { key: 'spinning', label: 'Bicicletas de spinning' },
    ],
  },
  {
    key: 'other',
    label: 'Otros',
    items: [
      { key: 'bands', label: 'Bandas elásticas' },
      { key: 'mats', label: 'Colchonetas' },
      { key: 'fitball', label: 'Fitball o bosu' },
      { key: 'foam_roller', label: 'Rodillo de espuma' },
      { key: 'pool', label: 'Pileta' },
      { key: 'turf', label: 'Zona de césped (pista)' },
    ],
  },
];

export interface Specialty {
  key: string;
  label: string;
  /** Qué le pide a la IA ese enfoque. */
  guidance: string;
}

export const SPECIALTIES: Specialty[] = [
  {
    key: 'GENERAL',
    label: 'Gimnasio general',
    guidance: 'Gimnasio tradicional de uso mixto: musculación con máquinas y pesas, y algo de cardio.',
  },
  {
    key: 'HIPERTROFIA',
    label: 'Hipertrofia (ganar músculo)',
    guidance:
      'Enfoque en hipertrofia: rutinas de volumen moderado a alto por grupo muscular, rangos de 6 a 15 repeticiones, ejercicios básicos y aislamiento.',
  },
  {
    key: 'FUERZA',
    label: 'Fuerza y powerlifting',
    guidance:
      'Enfoque en fuerza: sentadilla, press de banca y peso muerto como base, rangos bajos de repeticiones (1 a 6) con descansos largos y accesorios que los apoyen.',
  },
  {
    key: 'CROSSFIT',
    label: 'CrossFit',
    guidance:
      'Enfoque CrossFit: mezcla de levantamientos olímpicos, gimnásticos (dominadas, anillas) y acondicionamiento metabólico en formato WOD, con trabajo de fuerza.',
  },
  {
    key: 'FUNCIONAL',
    label: 'Entrenamiento funcional',
    guidance:
      'Enfoque funcional: patrones de movimiento (empujar, tirar, sentadilla, bisagra, cargar), circuitos, trabajo de core y movilidad con peso corporal y elementos funcionales.',
  },
  {
    key: 'CALISTENIA',
    label: 'Calistenia',
    guidance: 'Enfoque en calistenia: peso corporal, barras, paralelas y anillas, con progresiones de habilidades.',
  },
  {
    key: 'DEPORTES',
    label: 'Deportes específicos',
    guidance:
      'Gimnasio orientado a preparación física para deportes: fuerza, potencia, velocidad y prevención de lesiones aplicadas al deporte indicado.',
  },
];

export function specialtyByKey(key: string | null | undefined): Specialty | null {
  return SPECIALTIES.find((s) => s.key === key) ?? null;
}

const ALL_ITEMS = EQUIPMENT_GROUPS.flatMap((g) => g.items);
const ITEM_KEYS = new Set(ALL_ITEMS.map((i) => i.key));

export interface GymProfile {
  items: string[];
  notes: string;
  specialtyDetail: string;
}

/** Lee lo guardado en `gym.equipment` con cuidado: ignora claves que no existen y recorta los textos. */
export function parseGymProfile(raw: unknown): GymProfile {
  const o = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const items = Array.isArray(o.items) ? o.items.filter((x): x is string => typeof x === 'string' && ITEM_KEYS.has(x)) : [];
  return {
    items: [...new Set(items)],
    notes: typeof o.notes === 'string' ? o.notes.slice(0, 600) : '',
    specialtyDetail: typeof o.specialtyDetail === 'string' ? o.specialtyDetail.slice(0, 200) : '',
  };
}

/**
 * Lo que la IA tiene que saber del gimnasio del socio, en líneas para el prompt. Sin equipamiento cargado
 * no inventa límites: avisa que el gimnasio no cargó sus máquinas.
 */
export function gymContextLines(args: { name: string; specialty: string | null; profile: GymProfile }): string[] {
  const { name, specialty, profile } = args;
  const lines: string[] = [`Gimnasio del socio: ${name}`];
  const sp = specialtyByKey(specialty);
  if (sp) {
    lines.push(`Especialidad del gimnasio: ${sp.label}${profile.specialtyDetail ? ` (${profile.specialtyDetail})` : ''}`);
    lines.push(`Enfoque a respetar en sus rutinas: ${sp.guidance}`);
  }
  const labels = profile.items.map((k) => ALL_ITEMS.find((i) => i.key === k)?.label).filter((l): l is string => !!l);
  if (labels.length > 0) {
    lines.push(`Equipamiento del gimnasio (cuando entrene ahí, usá SOLO esto): ${labels.join('; ')}`);
    if (profile.notes) lines.push(`Aclaraciones del gimnasio sobre su equipamiento: ${profile.notes}`);
    lines.push(
      'IMPORTANTE: armale los ejercicios del gimnasio con las máquinas y elementos de arriba. No uses equipamiento que el gimnasio no tiene.',
    );
  } else {
    lines.push('El gimnasio todavía no cargó sus máquinas: usá el equipo que indica el socio.');
  }
  return lines;
}
