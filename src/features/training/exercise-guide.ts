import 'server-only';
import type { MuscleGroup, Profile } from '@prisma/client';
import { prisma } from '@/server/db';
import { aiConfigured } from '@/server/ai/config';

export interface ExerciseGuide {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: string | null;
  cues: string[];
  alternatives: Array<{ id: string; name: string; equipment: string | null }>;
}

function asMuscleArray(v: unknown): MuscleGroup[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as MuscleGroup[]) : [];
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Devuelve la guía del ejercicio. Si no tiene cues cacheados, los genera con IA
 * y los guarda en la fila (compartido para los ejercicios del sistema).
 */
export async function getExerciseGuide(
  profile: Profile,
  exerciseId: string,
): Promise<ExerciseGuide | null> {
  const ex = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      name: true,
      primaryMuscle: true,
      secondaryMuscles: true,
      equipment: true,
      cues: true,
      isCustom: true,
      createdById: true,
    },
  });
  if (!ex) return null;
  if (ex.isCustom && ex.createdById !== profile.id) return null;

  let cues = asStringArray(ex.cues);
  let secondary = asMuscleArray(ex.secondaryMuscles);

  if (cues.length === 0 && aiConfigured()) {
    const { describeExercise } = await import('@/server/ai/gateway');
    const guide = await describeExercise({
      userId: profile.id,
      timezone: profile.timezone,
      locale: profile.locale,
      name: ex.name,
      primaryMuscle: ex.primaryMuscle,
      equipment: ex.equipment,
    });
    if (guide && guide.cues.length > 0) {
      cues = guide.cues;
      if (secondary.length === 0) secondary = guide.secondaryMuscles as MuscleGroup[];
      await prisma.exercise
        .update({
          where: { id: exerciseId },
          data: {
            cues: guide.cues,
            ...(asMuscleArray(ex.secondaryMuscles).length === 0
              ? { secondaryMuscles: guide.secondaryMuscles }
              : {}),
            guideGeneratedAt: new Date(),
          },
        })
        .catch(() => {});
    }
  }

  const alternatives = await prisma.exercise.findMany({
    where: {
      primaryMuscle: ex.primaryMuscle,
      id: { not: exerciseId },
      OR: [{ isCustom: false }, { createdById: profile.id }],
    },
    orderBy: { name: 'asc' },
    take: 6,
    select: { id: true, name: true, equipment: true },
  });

  return {
    id: ex.id,
    name: ex.name,
    primaryMuscle: ex.primaryMuscle,
    secondaryMuscles: secondary,
    equipment: ex.equipment,
    cues,
    alternatives,
  };
}
