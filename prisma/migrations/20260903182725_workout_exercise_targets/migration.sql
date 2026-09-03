-- Objetivos por ejercicio en la sesión (copiados del plan al iniciar, editables).
ALTER TABLE "workout_exercise"
  ADD COLUMN "target_reps_min" INTEGER,
  ADD COLUMN "target_reps_max" INTEGER,
  ADD COLUMN "target_rir" DOUBLE PRECISION,
  ADD COLUMN "rest_seconds" INTEGER;
