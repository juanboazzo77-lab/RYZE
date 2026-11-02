-- La revision semanal cubre desde la revision anterior (no la semana calendario): se guarda el periodo.
ALTER TABLE "weekly_checkin" ADD COLUMN "period_start" DATE,
ADD COLUMN "period_end" DATE;
