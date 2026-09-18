-- Soporte de ejercicios de cardio (pasos, correr, distancia/duración) y
-- explicaciones ("por qué") de la IA en planes de entrenamiento y objetivos
-- de nutrición.

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('STRENGTH', 'CARDIO');

-- AlterTable: Exercise
ALTER TABLE "exercise" ADD COLUMN "type" "ExerciseType" NOT NULL DEFAULT 'STRENGTH';

-- AlterTable: PlanExercise
ALTER TABLE "plan_exercise" ADD COLUMN "target_duration_sec" INTEGER;
ALTER TABLE "plan_exercise" ADD COLUMN "target_distance_meters" DOUBLE PRECISION;
ALTER TABLE "plan_exercise" ADD COLUMN "rationale" TEXT;

-- AlterTable: WorkoutExercise
ALTER TABLE "workout_exercise" ADD COLUMN "target_duration_sec" INTEGER;
ALTER TABLE "workout_exercise" ADD COLUMN "target_distance_meters" DOUBLE PRECISION;

-- AlterTable: WorkoutSet
ALTER TABLE "workout_set" ADD COLUMN "duration_seconds" INTEGER;
ALTER TABLE "workout_set" ADD COLUMN "distance_meters" DOUBLE PRECISION;

-- AlterTable: NutritionTarget
ALTER TABLE "nutrition_target" ADD COLUMN "rationale" TEXT;
