-- Revisión semanal: 3 preguntas subjetivas más (1-5).
ALTER TABLE "weekly_checkin"
  ADD COLUMN "diet_adherence" INTEGER,
  ADD COLUMN "stress" INTEGER,
  ADD COLUMN "outside_activity" INTEGER;

-- Día de la semana elegido para el recordatorio del check-in (1 = lunes … 7 = domingo).
ALTER TABLE "notification_preference" ADD COLUMN "day_of_week" INTEGER;
