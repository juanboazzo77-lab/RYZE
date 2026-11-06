-- Datos de cobro del gimnasio, para armar el QR que imprime y pone en el mostrador.
ALTER TABLE "gym" ADD COLUMN "payment_link" TEXT;
ALTER TABLE "gym" ADD COLUMN "payment_alias" TEXT;
