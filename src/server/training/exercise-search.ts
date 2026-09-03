import 'server-only';
import { Prisma } from '@prisma/client';
import type { MuscleGroup } from '@prisma/client';
import { prisma } from '@/server/db';

export interface ExerciseResult {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  equipment: string | null;
  isCustom: boolean;
}

/** Biblioteca de ejercicios: SYSTEM + los del usuario. Prefijo, luego similitud. */
export async function searchExercises(
  userId: string,
  query: string,
  limit = 30,
): Promise<ExerciseResult[]> {
  const q = query.trim();
  const hasQ = q.length >= 2;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      primary_muscle: MuscleGroup;
      equipment: string | null;
      is_custom: boolean;
    }>
  >(Prisma.sql`
    SELECT id, name, primary_muscle, equipment, is_custom
    FROM "exercise"
    WHERE (is_custom = false OR created_by = ${userId}::uuid)
      ${hasQ ? Prisma.sql`AND name ILIKE ${'%' + q + '%'}` : Prisma.empty}
    ORDER BY
      ${hasQ ? Prisma.sql`(name ILIKE ${q + '%'}) DESC, similarity(name, ${q}) DESC,` : Prisma.empty}
      name ASC
    LIMIT ${limit}
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    primaryMuscle: r.primary_muscle,
    equipment: r.equipment,
    isCustom: r.is_custom,
  }));
}
