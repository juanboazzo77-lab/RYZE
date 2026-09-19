-- Preferencias de entrenamiento en el perfil base (todos los planes, no sólo
-- COACH): grupos musculares a priorizar, ejercicios a evitar y split
-- preferido, para que el generador de rutinas con IA sea menos genérico.

-- AlterTable: Profile
ALTER TABLE "profile" ADD COLUMN "muscle_priorities" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "profile" ADD COLUMN "disliked_exercises" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "profile" ADD COLUMN "routine_style" TEXT;
