-- Los gimnasios pagan en su moneda: pesos argentinos (por defecto, $5.000 por socio por mes) o dólares.
-- Las columnas siguen llamándose *_usd en la base (no se renombran para no cortar el servicio); el código las
-- lee como "precio" y "monto" en la moneda de cada gimnasio / cobro.
ALTER TABLE "gym" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE "gym" ALTER COLUMN "price_per_member_usd" SET DEFAULT 5000;
-- Los gimnasios que seguían con el precio de dólares de antes pasan al de pesos.
UPDATE "gym" SET "price_per_member_usd" = 5000 WHERE "price_per_member_usd" = 1.50;

-- Los cobros que ya existían quedan en dólares (así se armaron); los nuevos llevan la moneda de su gimnasio.
ALTER TABLE "gym_payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
