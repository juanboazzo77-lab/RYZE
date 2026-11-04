-- Se saca el modo entrenador: tablas, columnas y bucket. (Copia de los datos hecha antes de aplicar esto.)
DROP TABLE IF EXISTS "trainer_note";
DROP TABLE IF EXISTS "trainer_message_block";
DROP TABLE IF EXISTS "trainer_message";
DROP TABLE IF EXISTS "trainer_client";
DROP TABLE IF EXISTS "trainer_profile";

ALTER TABLE "profile" DROP COLUMN IF EXISTS "account_type";
ALTER TABLE "weekly_checkin" DROP COLUMN IF EXISTS "photo_paths";
ALTER TABLE "entitlement" DROP COLUMN IF EXISTS "managed_trial_granted_at";

-- El bucket de fotos de revision estaba vacio. Supabase puede negar el borrado directo: no debe frenar el deploy.
DO $$
BEGIN
  DELETE FROM storage.buckets WHERE id = 'checkin-photos';
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;
