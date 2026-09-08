-- Propuesta de progresión de entrenamiento del check-in semanal.
ALTER TABLE "weekly_checkin" ADD COLUMN "ai_training_proposal" JSONB;
