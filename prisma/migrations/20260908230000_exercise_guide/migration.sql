-- Guía de ejercicio: cues de técnica (cacheados desde IA) + músculos secundarios.
ALTER TABLE "exercise"
  ADD COLUMN "cues" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "guide_generated_at" TIMESTAMP(3);
