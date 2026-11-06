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
      { key: 'power_rack', label: 'Power rack con topes de seguridad' },
      { key: 'bench_flat', label: 'Banco plano' },
      { key: 'bench_adjustable', label: 'Banco regulable (inclinado)' },
      { key: 'bench_decline', label: 'Banco declinado' },
      { key: 'preacher', label: 'Banco Scott (curl predicador)' },
      { key: 'ez_bar', label: 'Barra Z' },
      { key: 'trap_bar', label: 'Barra hexagonal' },
      { key: 'safety_squat_bar', label: 'Barra de seguridad para sentadilla' },
      { key: 'fixed_barbells', label: 'Barras fijas pre-cargadas (curl)' },
      { key: 'weight_plates', label: 'Discos sueltos para trabajo de agarre y plato' },
      { key: 'deadlift_platform', label: 'Plataforma de peso muerto' },
      { key: 'lifting_belts', label: 'Cinturones y straps' },
      { key: 'dip_belt', label: 'Cinturón de lastre (dominadas y fondos con peso)' },
    ],
  },
  {
    key: 'machines_legs',
    label: 'Máquinas: piernas y glúteos',
    items: [
      { key: 'leg_press', label: 'Prensa de piernas 45°' },
      { key: 'leg_press_horizontal', label: 'Prensa horizontal o sentada' },
      { key: 'hack_squat', label: 'Hack squat' },
      { key: 'pendulum_squat', label: 'Sentadilla péndulo' },
      { key: 'belt_squat', label: 'Belt squat (sentadilla con cinturón)' },
      { key: 'smith', label: 'Máquina Smith o multipower' },
      { key: 'leg_extension', label: 'Extensión de cuádriceps' },
      { key: 'leg_curl', label: 'Curl femoral acostado' },
      { key: 'leg_curl_seated', label: 'Curl femoral sentado' },
      { key: 'hip_abductor', label: 'Abductores y aductores' },
      { key: 'glute_machine', label: 'Patada de glúteo en máquina' },
      { key: 'hip_thrust', label: 'Banco o máquina de hip thrust' },
      { key: 'calf_machine', label: 'Gemelos en máquina (de pie o sentado)' },
      { key: 'calf_standing', label: 'Gemelos de pie' },
      { key: 'calf_seated', label: 'Gemelos sentado' },
      { key: 'calf_press', label: 'Gemelos en prensa' },
      { key: 'reverse_hyper', label: 'Reverse hyper' },
      { key: 'nordic_bench', label: 'Soporte para curl nórdico' },
    ],
  },
  {
    key: 'machines_upper',
    label: 'Máquinas: pecho, espalda y hombros',
    items: [
      { key: 'chest_press', label: 'Press de pecho en máquina' },
      { key: 'chest_press_incline', label: 'Press inclinado en máquina' },
      { key: 'chest_press_decline', label: 'Press declinado en máquina' },
      { key: 'pec_deck', label: 'Pec deck (aperturas)' },
      { key: 'dip_machine', label: 'Fondos en máquina' },
      { key: 'shoulder_press', label: 'Press de hombros en máquina' },
      { key: 'lateral_raise_machine', label: 'Elevaciones laterales en máquina' },
      { key: 'rear_delt_machine', label: 'Deltoides posterior (reverse pec deck)' },
      { key: 'lat_pulldown', label: 'Jalón al pecho' },
      { key: 'lat_pulldown_neutral', label: 'Jalón de agarre neutro o por separado' },
      { key: 'seated_row', label: 'Remo sentado en máquina' },
      { key: 'low_row', label: 'Remo bajo con apoyo en el pecho' },
      { key: 't_bar_row', label: 'Remo en T (T-bar)' },
      { key: 'high_row', label: 'Remo alto o dorsal en máquina' },
      { key: 'pullover_machine', label: 'Pull-over en máquina' },
      { key: 'shrug_machine', label: 'Trapecios en máquina' },
      { key: 'assisted_pullup', label: 'Dominadas y fondos asistidos' },
      { key: 'plate_loaded_chest', label: 'Máquinas de pecho con discos (hammer)' },
      { key: 'plate_loaded_back', label: 'Máquinas de espalda con discos (hammer)' },
    ],
  },
  {
    key: 'machines_arms_core',
    label: 'Máquinas: brazos, core y lumbar',
    items: [
      { key: 'biceps_machine', label: 'Curl de bíceps en máquina' },
      { key: 'triceps_machine', label: 'Tríceps en máquina' },
      { key: 'triceps_dip_bench', label: 'Banco o soporte para fondos de tríceps' },
      { key: 'forearm_machine', label: 'Antebrazos (muñeca)' },
      { key: 'ab_machine', label: 'Abdominales en máquina' },
      { key: 'torso_rotation', label: 'Rotación de torso en máquina' },
      { key: 'ab_bench_decline', label: 'Banco declinado de abdominales' },
      { key: 'captain_chair', label: 'Silla romana (elevación de piernas)' },
      { key: 'ab_wheel', label: 'Rueda abdominal' },
      { key: 'back_extension', label: 'Banco romano o lumbares' },
      { key: 'ghd', label: 'GHD (glute-ham developer)' },
      { key: 'neck_machine', label: 'Máquina de cuello' },
    ],
  },
  {
    key: 'cables',
    label: 'Poleas y accesorios',
    items: [
      { key: 'cable_crossover', label: 'Poleas dobles / crossover' },
      { key: 'cable_single', label: 'Polea simple ajustable' },
      { key: 'cable_high', label: 'Polea alta' },
      { key: 'cable_low', label: 'Polea baja' },
      { key: 'functional_trainer', label: 'Functional trainer (poleas regulables)' },
      { key: 'cable_rope', label: 'Soga para tríceps y abdominales' },
      { key: 'cable_straight_bar', label: 'Barra recta de polea' },
      { key: 'cable_v_bar', label: 'Agarre en V o triángulo' },
      { key: 'cable_ez', label: 'Barra Z de polea' },
      { key: 'cable_handles', label: 'Manijas individuales' },
      { key: 'ankle_strap', label: 'Tobillera para polea' },
      { key: 'lat_bar_wide', label: 'Barra ancha de jalón' },
    ],
  },
  {
    key: 'functional',
    label: 'Funcional y CrossFit',
    items: [
      { key: 'pullup_bar', label: 'Barras de dominadas' },
      { key: 'rig', label: 'Rig o estructura de dominadas' },
      { key: 'rings', label: 'Anillas' },
      { key: 'plyo_box', label: 'Cajones de salto' },
      { key: 'battle_ropes', label: 'Sogas de batalla' },
      { key: 'sled', label: 'Trineo' },
      { key: 'medicine_ball', label: 'Pelotas medicinales / wall ball' },
      { key: 'slam_ball', label: 'Slam balls' },
      { key: 'trx', label: 'TRX o suspensión' },
      { key: 'landmine', label: 'Landmine' },
      { key: 'heavy_bag', label: 'Bolsa de boxeo' },
      { key: 'jump_rope', label: 'Sogas de saltar' },
      { key: 'rower', label: 'Remo ergómetro' },
      { key: 'assault_bike', label: 'Assault bike' },
      { key: 'ski_erg', label: 'Ski erg' },
      { key: 'bumper_plates', label: 'Discos bumper (levantamientos olímpicos)' },
      { key: 'olympic_platform', label: 'Plataforma de levantamiento olímpico' },
      { key: 'sandbag', label: 'Sandbags (bolsas de arena)' },
      { key: 'tires', label: 'Neumáticos para voltear' },
      { key: 'sledgehammer', label: 'Maza' },
      { key: 'farmer_handles', label: 'Farmer handles (paseo del granjero)' },
      { key: 'yoke', label: 'Yoke y elementos de strongman' },
      { key: 'parallettes', label: 'Paralelas bajas' },
      { key: 'climbing_rope', label: 'Cuerda de trepar' },
      { key: 'agility_ladder', label: 'Escalera y conos de agilidad' },
      { key: 'hurdles', label: 'Vallas' },
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
      { key: 'recumbent_bike', label: 'Bicicleta reclinada' },
      { key: 'arc_trainer', label: 'Arc trainer' },
      { key: 'curved_treadmill', label: 'Cinta curva (sin motor)' },
    ],
  },
  {
    key: 'other',
    label: 'Otros',
    items: [
      { key: 'bands', label: 'Bandas elásticas' },
      { key: 'mini_bands', label: 'Mini bandas (glúteo)' },
      { key: 'mats', label: 'Colchonetas' },
      { key: 'fitball', label: 'Fitball o bosu' },
      { key: 'bosu', label: 'Bosu' },
      { key: 'foam_roller', label: 'Rodillo de espuma' },
      { key: 'massage_ball', label: 'Pelotas de masaje' },
      { key: 'stretch_area', label: 'Zona de elongación' },
      { key: 'pool', label: 'Pileta' },
      { key: 'turf', label: 'Zona de césped (pista)' },
      { key: 'running_track', label: 'Pista de atletismo' },
      { key: 'boxing_ring', label: 'Ring o tatami' },
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
