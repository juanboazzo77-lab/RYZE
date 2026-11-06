-- Aceptación de los términos para gimnasios (cuándo y qué versión).
ALTER TABLE "gym" ADD COLUMN "terms_accepted_at" TIMESTAMP(3);
ALTER TABLE "gym" ADD COLUMN "terms_version" TEXT;
