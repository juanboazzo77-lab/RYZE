-- Hasta cuándo se muestra un mensaje del gimnasio en la pantalla principal de sus clientes (después desaparece).
-- Los mensajes que ya existen quedan activos 7 días desde que se crearon. Aditiva.
ALTER TABLE "gym_message" ADD COLUMN "expires_at" TIMESTAMP(3);
UPDATE "gym_message" SET "expires_at" = "created_at" + INTERVAL '7 days';
ALTER TABLE "gym_message" ALTER COLUMN "expires_at" SET NOT NULL;
