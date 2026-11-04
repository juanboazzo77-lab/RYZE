import 'server-only';
import type { MuscleGroup } from '@prisma/client';
import { prisma } from '@/server/db';

/**
 * Busca un ejercicio por nombre en la biblioteca (o crea uno propio de la persona). Lo comparten el
 * armado de rutinas del coach y el de los entrenadores.
 */

const MUSCLE_KEYWORDS: Array<[RegExp, MuscleGroup]> = [
  [/press de banca|pecho|pectoral|apertura|fondos|push[- ]?up|flexion/i, 'CHEST'],
  [/domina|jal[oó]n|remo|pull[- ]?up|espalda|dorsal/i, 'BACK'],
  [/press militar|hombro|deltoid|elevaci[oó]n lateral|arnold/i, 'SHOULDERS'],
  [/curl|b[ií]ceps/i, 'BICEPS'],
  [/tr[ií]ceps|extensi[oó]n de codo|press franc[eé]s|copa/i, 'TRICEPS'],
  [/sentadilla|prensa|zancada|extensi[oó]n de cu[aá]driceps|hack|squat|lunge/i, 'QUADS'],
  [/femoral|isquio|peso muerto rumano|curl nórdico|hamstring/i, 'HAMSTRINGS'],
  [/hip thrust|gl[uú]teo|puente de gl[uú]teo|patada de gl[uú]teo/i, 'GLUTES'],
  [/gemelo|pantorrilla|talon|calf|sóleo/i, 'CALVES'],
  [/abdominal|plancha|crunch|core|rueda abdominal|elevaci[oó]n de piernas/i, 'ABS'],
  [/peso muerto|deadlift/i, 'BACK'],
];

export function guessMuscle(name: string): MuscleGroup {
  for (const [re, m] of MUSCLE_KEYWORDS) if (re.test(name)) return m;
  return 'OTHER';
}

/** Encuentra el ejercicio en la biblioteca o crea uno custom del usuario. */
export async function resolveExerciseId(
  name: string,
  userId: string,
  type: 'STRENGTH' | 'CARDIO',
): Promise<string> {
  const clean = name.trim().slice(0, 80);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "exercise"
    WHERE (is_custom = false OR created_by = ${userId}::uuid)
      AND (name ILIKE ${clean} OR similarity(name, ${clean}) > 0.45)
    ORDER BY (name ILIKE ${clean}) DESC, similarity(name, ${clean}) DESC
    LIMIT 1
  `;
  if (rows[0]) return rows[0].id;

  const created = await prisma.exercise.create({
    data: {
      name: clean,
      type,
      primaryMuscle: guessMuscle(clean),
      isCustom: true,
      createdById: userId,
    },
    select: { id: true },
  });
  return created.id;
}
