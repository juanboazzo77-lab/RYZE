-- Los pasos se pueden cambiar desde la web y desde la app sin senal: hace falta saber cual cambio se hizo despues.
-- Es aditivo: las filas viejas quedan vacias (se usa updated_at) y no se reescribe nada.
ALTER TABLE "daily_activity" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3);
ALTER TABLE "daily_activity" ALTER COLUMN "edited_at" SET DEFAULT (now() AT TIME ZONE 'utc');

-- La funcion ya existe (20261125180000_mobile_sync).
DROP TRIGGER IF EXISTS set_edited_at ON "daily_activity";
CREATE TRIGGER set_edited_at BEFORE UPDATE ON "daily_activity" FOR EACH ROW EXECUTE FUNCTION public.set_edited_at();
