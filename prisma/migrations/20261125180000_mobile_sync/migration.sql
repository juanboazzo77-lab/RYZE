-- Puerta de entrada de la app independiente. Todo es aditivo: la web actual sigue funcionando igual.

CREATE TABLE IF NOT EXISTS "sync_op" (
  "user_id" UUID NOT NULL,
  "op_id" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL,
  "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sync_op_pkey" PRIMARY KEY ("user_id", "op_id"),
  CONSTRAINT "sync_op_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
-- Sin politicas: nadie entra por la API publica de Supabase, solo el servidor.
ALTER TABLE "sync_op" ENABLE ROW LEVEL SECURITY;

-- Cuando la persona hizo el ultimo cambio. Las filas viejas quedan vacias (se usa updated_at): no se reescribe nada.
ALTER TABLE "weight_entry" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3);
ALTER TABLE "weight_entry" ALTER COLUMN "edited_at" SET DEFAULT (now() AT TIME ZONE 'utc');

-- Si quien actualiza no dice cuando se hizo el cambio (la web), es ahora. La app lo manda explicito.
CREATE OR REPLACE FUNCTION public.set_edited_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.edited_at IS NOT DISTINCT FROM OLD.edited_at THEN
    NEW.edited_at = now() AT TIME ZONE 'utc';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_edited_at ON "weight_entry";
CREATE TRIGGER set_edited_at BEFORE UPDATE ON "weight_entry" FOR EACH ROW EXECUTE FUNCTION public.set_edited_at();
