-- Comprobante de pago de cada alta de socio (archivo en un depósito privado).
ALTER TABLE "gym_invite" ADD COLUMN "proof_path" TEXT;

-- El depósito privado donde se guardan. Si Supabase no deja crearlo desde acá, la app lo crea la primera vez
-- que se sube un archivo: no debe frenar el despliegue.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('gym-payment-proofs', 'gym-payment-proofs', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;
