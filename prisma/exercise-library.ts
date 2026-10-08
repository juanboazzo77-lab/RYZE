import type { MuscleGroup } from '@prisma/client';

export type ExerciseSeed = {
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: string;
  type?: 'STRENGTH' | 'CARDIO';
};

const BAR = 'Barra';
const DB = 'Mancuernas';
const CABLE = 'Polea';
const MACH = 'Máquina';
const BW = 'Peso corporal';
const KB = 'Kettlebell';
const BAND = 'Banda elástica';

/** Biblioteca base por grupo muscular. El seed la inserta de forma aditiva (por nombre). */
export const EXERCISE_LIBRARY: ExerciseSeed[] = [
  // ---- Pecho ----
  { name: 'Press de banca', primaryMuscle: 'CHEST', equipment: BAR },
  { name: 'Press de banca inclinado con barra', primaryMuscle: 'CHEST', equipment: BAR },
  { name: 'Press de banca declinado', primaryMuscle: 'CHEST', equipment: BAR },
  { name: 'Press plano con mancuernas', primaryMuscle: 'CHEST', equipment: DB },
  { name: 'Press inclinado con mancuernas', primaryMuscle: 'CHEST', equipment: DB },
  { name: 'Press declinado con mancuernas', primaryMuscle: 'CHEST', equipment: DB },
  { name: 'Press en máquina', primaryMuscle: 'CHEST', equipment: MACH },
  { name: 'Press inclinado en máquina', primaryMuscle: 'CHEST', equipment: MACH },
  { name: 'Aperturas con mancuernas', primaryMuscle: 'CHEST', equipment: DB },
  { name: 'Aperturas inclinadas con mancuernas', primaryMuscle: 'CHEST', equipment: DB },
  { name: 'Aperturas en polea', primaryMuscle: 'CHEST', equipment: CABLE },
  { name: 'Cruce de poleas alto', primaryMuscle: 'CHEST', equipment: CABLE },
  { name: 'Cruce de poleas bajo', primaryMuscle: 'CHEST', equipment: CABLE },
  { name: 'Contractor / Pec deck', primaryMuscle: 'CHEST', equipment: MACH },
  { name: 'Flexiones de brazos', primaryMuscle: 'CHEST', equipment: BW },
  { name: 'Flexiones con pies elevados', primaryMuscle: 'CHEST', equipment: BW },
  { name: 'Fondos para pecho', primaryMuscle: 'CHEST', equipment: BW },
  { name: 'Pullover con mancuerna', primaryMuscle: 'CHEST', equipment: DB },

  // ---- Espalda ----
  { name: 'Dominadas', primaryMuscle: 'BACK', equipment: BW },
  { name: 'Dominadas supinas', primaryMuscle: 'BACK', equipment: BW },
  { name: 'Dominadas asistidas', primaryMuscle: 'BACK', equipment: MACH },
  { name: 'Jalón al pecho', primaryMuscle: 'BACK', equipment: CABLE },
  { name: 'Jalón al pecho agarre cerrado', primaryMuscle: 'BACK', equipment: CABLE },
  { name: 'Jalón tras nuca', primaryMuscle: 'BACK', equipment: CABLE },
  { name: 'Remo con barra', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Remo Pendlay', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Remo con mancuerna a una mano', primaryMuscle: 'BACK', equipment: DB },
  { name: 'Remo en polea baja', primaryMuscle: 'BACK', equipment: CABLE },
  { name: 'Remo en máquina', primaryMuscle: 'BACK', equipment: MACH },
  { name: 'Remo en T', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Remo invertido', primaryMuscle: 'BACK', equipment: BW },
  { name: 'Remo con apoyo en banco inclinado', primaryMuscle: 'BACK', equipment: DB },
  { name: 'Pullover en polea', primaryMuscle: 'BACK', equipment: CABLE },
  { name: 'Peso muerto convencional', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Peso muerto sumo', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Hiperextensiones', primaryMuscle: 'BACK', equipment: BW },
  { name: 'Buenos días', primaryMuscle: 'BACK', equipment: BAR },
  { name: 'Superman', primaryMuscle: 'BACK', equipment: BW },

  // ---- Hombros ----
  { name: 'Press militar', primaryMuscle: 'SHOULDERS', equipment: BAR },
  { name: 'Press militar con mancuernas', primaryMuscle: 'SHOULDERS', equipment: DB },
  { name: 'Press Arnold', primaryMuscle: 'SHOULDERS', equipment: DB },
  { name: 'Press de hombros en máquina', primaryMuscle: 'SHOULDERS', equipment: MACH },
  { name: 'Elevaciones laterales', primaryMuscle: 'SHOULDERS', equipment: DB },
  { name: 'Elevaciones laterales en polea', primaryMuscle: 'SHOULDERS', equipment: CABLE },
  { name: 'Elevaciones frontales', primaryMuscle: 'SHOULDERS', equipment: DB },
  { name: 'Pájaros con mancuernas', primaryMuscle: 'SHOULDERS', equipment: DB },
  { name: 'Pájaros en máquina (deltoide posterior)', primaryMuscle: 'SHOULDERS', equipment: MACH },
  { name: 'Face pull', primaryMuscle: 'SHOULDERS', equipment: CABLE },
  { name: 'Remo al mentón', primaryMuscle: 'SHOULDERS', equipment: BAR },
  { name: 'Push press', primaryMuscle: 'SHOULDERS', equipment: BAR },
  { name: 'Pike push-up', primaryMuscle: 'SHOULDERS', equipment: BW },

  // ---- Trapecios ----
  { name: 'Encogimientos con barra', primaryMuscle: 'TRAPS', equipment: BAR },
  { name: 'Encogimientos con mancuernas', primaryMuscle: 'TRAPS', equipment: DB },
  { name: 'Encogimientos en máquina', primaryMuscle: 'TRAPS', equipment: MACH },
  { name: 'Paseo del granjero', primaryMuscle: 'TRAPS', equipment: DB },

  // ---- Bíceps ----
  { name: 'Curl de bíceps con barra', primaryMuscle: 'BICEPS', equipment: BAR },
  { name: 'Curl con barra Z', primaryMuscle: 'BICEPS', equipment: BAR },
  { name: 'Curl con mancuernas alterno', primaryMuscle: 'BICEPS', equipment: DB },
  { name: 'Curl martillo', primaryMuscle: 'BICEPS', equipment: DB },
  { name: 'Curl concentrado', primaryMuscle: 'BICEPS', equipment: DB },
  { name: 'Curl inclinado con mancuernas', primaryMuscle: 'BICEPS', equipment: DB },
  { name: 'Curl predicador', primaryMuscle: 'BICEPS', equipment: BAR },
  { name: 'Curl en polea baja', primaryMuscle: 'BICEPS', equipment: CABLE },
  { name: 'Curl en polea con cuerda', primaryMuscle: 'BICEPS', equipment: CABLE },
  { name: 'Curl en máquina', primaryMuscle: 'BICEPS', equipment: MACH },
  { name: 'Curl araña', primaryMuscle: 'BICEPS', equipment: DB },

  // ---- Tríceps ----
  { name: 'Extensión de tríceps en polea', primaryMuscle: 'TRICEPS', equipment: CABLE },
  { name: 'Extensión de tríceps con cuerda', primaryMuscle: 'TRICEPS', equipment: CABLE },
  { name: 'Extensión de tríceps sobre la cabeza en polea', primaryMuscle: 'TRICEPS', equipment: CABLE },
  { name: 'Press francés con barra Z', primaryMuscle: 'TRICEPS', equipment: BAR },
  { name: 'Press francés con mancuernas', primaryMuscle: 'TRICEPS', equipment: DB },
  { name: 'Extensión de tríceps con mancuerna sobre la cabeza', primaryMuscle: 'TRICEPS', equipment: DB },
  { name: 'Patada de tríceps', primaryMuscle: 'TRICEPS', equipment: DB },
  { name: 'Press cerrado en banca', primaryMuscle: 'TRICEPS', equipment: BAR },
  { name: 'Fondos en paralelas', primaryMuscle: 'TRICEPS', equipment: BW },
  { name: 'Fondos en banco', primaryMuscle: 'TRICEPS', equipment: BW },
  { name: 'Flexiones diamante', primaryMuscle: 'TRICEPS', equipment: BW },
  { name: 'Fondos en máquina', primaryMuscle: 'TRICEPS', equipment: MACH },

  // ---- Antebrazos ----
  { name: 'Curl de muñeca con barra', primaryMuscle: 'FOREARMS', equipment: BAR },
  { name: 'Curl de muñeca inverso', primaryMuscle: 'FOREARMS', equipment: BAR },
  { name: 'Curl inverso con barra', primaryMuscle: 'FOREARMS', equipment: BAR },
  { name: 'Colgado de barra', primaryMuscle: 'FOREARMS', equipment: BW },

  // ---- Cuádriceps ----
  { name: 'Sentadilla', primaryMuscle: 'QUADS', equipment: BAR },
  { name: 'Sentadilla frontal', primaryMuscle: 'QUADS', equipment: BAR },
  { name: 'Sentadilla goblet', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Sentadilla búlgara', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Sentadilla en máquina Smith', primaryMuscle: 'QUADS', equipment: MACH },
  { name: 'Sentadilla hack', primaryMuscle: 'QUADS', equipment: MACH },
  { name: 'Sentadilla con salto', primaryMuscle: 'QUADS', equipment: BW },
  { name: 'Prensa de piernas', primaryMuscle: 'QUADS', equipment: MACH },
  { name: 'Extensión de cuádriceps', primaryMuscle: 'QUADS', equipment: MACH },
  { name: 'Zancadas con mancuernas', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Zancadas caminando', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Zancadas reversas', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Step-up con mancuernas', primaryMuscle: 'QUADS', equipment: DB },
  { name: 'Sillón de cuádriceps (wall sit)', primaryMuscle: 'QUADS', equipment: BW },
  { name: 'Sentadilla pistol', primaryMuscle: 'QUADS', equipment: BW },

  // ---- Isquiotibiales ----
  { name: 'Peso muerto rumano', primaryMuscle: 'HAMSTRINGS', equipment: BAR },
  { name: 'Peso muerto rumano con mancuernas', primaryMuscle: 'HAMSTRINGS', equipment: DB },
  { name: 'Peso muerto a una pierna', primaryMuscle: 'HAMSTRINGS', equipment: DB },
  { name: 'Peso muerto piernas rígidas', primaryMuscle: 'HAMSTRINGS', equipment: BAR },
  { name: 'Curl femoral', primaryMuscle: 'HAMSTRINGS', equipment: MACH },
  { name: 'Curl femoral sentado', primaryMuscle: 'HAMSTRINGS', equipment: MACH },
  { name: 'Curl femoral con mancuerna', primaryMuscle: 'HAMSTRINGS', equipment: DB },
  { name: 'Curl nórdico', primaryMuscle: 'HAMSTRINGS', equipment: BW },
  { name: 'Buenos días con mancuernas', primaryMuscle: 'HAMSTRINGS', equipment: DB },

  // ---- Glúteos ----
  { name: 'Hip thrust', primaryMuscle: 'GLUTES', equipment: BAR },
  { name: 'Hip thrust con mancuerna', primaryMuscle: 'GLUTES', equipment: DB },
  { name: 'Puente de glúteos', primaryMuscle: 'GLUTES', equipment: BW },
  { name: 'Puente de glúteos a una pierna', primaryMuscle: 'GLUTES', equipment: BW },
  { name: 'Patada de glúteo en polea', primaryMuscle: 'GLUTES', equipment: CABLE },
  { name: 'Patada de glúteo en cuadrupedia', primaryMuscle: 'GLUTES', equipment: BW },
  { name: 'Patada de glúteo en máquina', primaryMuscle: 'GLUTES', equipment: MACH },
  { name: 'Abducción de cadera en máquina', primaryMuscle: 'GLUTES', equipment: MACH },
  { name: 'Abducción de cadera con banda', primaryMuscle: 'GLUTES', equipment: BAND },
  { name: 'Sentadilla sumo con mancuerna', primaryMuscle: 'GLUTES', equipment: DB },
  { name: 'Zancada lateral', primaryMuscle: 'GLUTES', equipment: DB },
  { name: 'Pull-through en polea', primaryMuscle: 'GLUTES', equipment: CABLE },
  { name: 'Aductores en máquina', primaryMuscle: 'GLUTES', equipment: MACH },

  // ---- Gemelos ----
  { name: 'Elevación de talones', primaryMuscle: 'CALVES', equipment: MACH },
  { name: 'Elevación de talones de pie', primaryMuscle: 'CALVES', equipment: BW },
  { name: 'Elevación de talones sentado', primaryMuscle: 'CALVES', equipment: MACH },
  { name: 'Elevación de talones en prensa', primaryMuscle: 'CALVES', equipment: MACH },
  { name: 'Elevación de talones con mancuernas', primaryMuscle: 'CALVES', equipment: DB },
  { name: 'Salto de soga', primaryMuscle: 'CALVES', equipment: BW },

  // ---- Abdominales ----
  { name: 'Plancha', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Plancha lateral', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Crunch abdominal', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Crunch en polea', primaryMuscle: 'ABS', equipment: CABLE },
  { name: 'Crunch en máquina', primaryMuscle: 'ABS', equipment: MACH },
  { name: 'Elevación de piernas colgado', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Elevación de rodillas colgado', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Elevación de piernas en banco', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Rueda abdominal', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Bicicleta abdominal', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Russian twist', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Mountain climbers', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Leñador en polea', primaryMuscle: 'ABS', equipment: CABLE },
  { name: 'Pallof press', primaryMuscle: 'ABS', equipment: CABLE },
  { name: 'Dead bug', primaryMuscle: 'ABS', equipment: BW },
  { name: 'Hollow hold', primaryMuscle: 'ABS', equipment: BW },

  // ---- Cuerpo completo ----
  { name: 'Burpees', primaryMuscle: 'FULL_BODY', equipment: BW },
  { name: 'Thruster con mancuernas', primaryMuscle: 'FULL_BODY', equipment: DB },
  { name: 'Swing con kettlebell', primaryMuscle: 'FULL_BODY', equipment: KB },
  { name: 'Clean con barra', primaryMuscle: 'FULL_BODY', equipment: BAR },
  { name: 'Arranque con mancuerna', primaryMuscle: 'FULL_BODY', equipment: DB },
  { name: 'Turkish get-up', primaryMuscle: 'FULL_BODY', equipment: KB },
  { name: 'Slam ball', primaryMuscle: 'FULL_BODY', equipment: 'Pelota medicinal' },
  { name: 'Battle ropes', primaryMuscle: 'FULL_BODY', equipment: 'Sogas' },

  // ---- Cardio ----
  // ---- Calentamiento y movilidad (por tiempo) ----
  { name: 'Calentamiento general', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Movilidad de cadera', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Movilidad de hombros', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Movilidad de columna torácica', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Movilidad de tobillos', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Activación de glúteos con banda', primaryMuscle: 'OTHER', equipment: BAND, type: 'CARDIO' },
  { name: 'Rotación externa de hombro con banda', primaryMuscle: 'OTHER', equipment: BAND, type: 'CARDIO' },
  { name: 'Calentamiento específico del deporte', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },

  { name: 'Cinta de correr', primaryMuscle: 'OTHER', equipment: MACH, type: 'CARDIO' },
  { name: 'Bicicleta fija', primaryMuscle: 'OTHER', equipment: MACH, type: 'CARDIO' },
  { name: 'Elíptico', primaryMuscle: 'OTHER', equipment: MACH, type: 'CARDIO' },
  { name: 'Remo en máquina (cardio)', primaryMuscle: 'OTHER', equipment: MACH, type: 'CARDIO' },
  { name: 'Escaladora', primaryMuscle: 'OTHER', equipment: MACH, type: 'CARDIO' },
  { name: 'Soga (saltar)', primaryMuscle: 'OTHER', equipment: 'Soga', type: 'CARDIO' },
  { name: 'Caminata', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
  { name: 'Trote', primaryMuscle: 'OTHER', equipment: BW, type: 'CARDIO' },
];
