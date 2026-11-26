-- Las comidas se pueden cambiar desde la web y desde la app sin senal: hace falta saber cual cambio se hizo despues.
-- Es aditivo: las filas viejas quedan vacias (se usa updated_at) y no se reescribe nada.
ALTER TABLE "food_entry" ADD COLUMN IF NOT EXISTS "edited_at" TIMESTAMP(3);
ALTER TABLE "food_entry" ALTER COLUMN "edited_at" SET DEFAULT (now() AT TIME ZONE 'utc');

-- La funcion ya existe (20261125180000_mobile_sync).
DROP TRIGGER IF EXISTS set_edited_at ON "food_entry";
CREATE TRIGGER set_edited_at BEFORE UPDATE ON "food_entry" FOR EACH ROW EXECUTE FUNCTION public.set_edited_at();
