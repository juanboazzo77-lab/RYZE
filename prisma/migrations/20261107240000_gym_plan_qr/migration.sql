-- Segundo QR del gimnasio: el cobro aparte del plan de rutina con IA (link de pago y valor sugerido).
ALTER TABLE "gym" ADD COLUMN "payment_plan_link" TEXT;
ALTER TABLE "gym" ADD COLUMN "payment_plan_amount" DECIMAL(12,2);
