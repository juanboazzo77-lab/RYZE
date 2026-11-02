-- Los días corridos de una rutina ("hoy no pude entrenar") valen sólo para esa semana:
-- se guarda el corrimiento y el inicio de la semana a la que aplica.
ALTER TABLE "workout_plan" ADD COLUMN "week_shift" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "week_shift_start" DATE;
