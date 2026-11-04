-- Revision semanal de un cliente manejado por un entrenador: las fotos que sube se guardan en un
-- bucket PRIVADO para que sólo su entrenador las vea (con enlaces que vencen). Se borran si el
-- cliente deja de compartir. Los clientes sin entrenador siguen sin guardar fotos.

ALTER TABLE "weekly_checkin" ADD COLUMN "photo_paths" JSONB;

-- Bucket privado. Si el esquema de storage no está disponible, la migración sigue: el código lo crea
-- al subir la primera foto.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo crear el bucket checkin-photos: %', SQLERRM;
END
$$;
