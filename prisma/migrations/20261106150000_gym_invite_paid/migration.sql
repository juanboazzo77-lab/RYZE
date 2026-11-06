-- El pago de cada alta lo confirma el admin (el comprobante le llega por mail o WhatsApp): se saca la ruta del
-- archivo y se guarda cuándo se confirmó el pago.
ALTER TABLE "gym_invite" DROP COLUMN IF EXISTS "proof_path";
ALTER TABLE "gym_invite" ADD COLUMN "paid_at" TIMESTAMP(3);
