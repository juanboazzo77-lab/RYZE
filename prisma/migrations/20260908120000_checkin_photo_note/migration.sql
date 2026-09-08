-- Análisis de las fotos de físico de la revisión semanal.
-- Las fotos NO se persisten: sólo se guarda este texto generado por la IA.
ALTER TABLE "weekly_checkin" ADD COLUMN "ai_photo_note" TEXT;
