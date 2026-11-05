-- Dueño de gimnasio (una cuenta de Forza AI) y permiso del socio para compartir su actividad.
ALTER TABLE "gym" ADD COLUMN "owner_user_id" UUID;
ALTER TABLE "gym" ADD CONSTRAINT "gym_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "gym_owner_user_id_idx" ON "gym"("owner_user_id");

ALTER TABLE "gym_member" ADD COLUMN "share_activity" BOOLEAN NOT NULL DEFAULT false;
