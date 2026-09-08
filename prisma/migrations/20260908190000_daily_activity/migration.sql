-- Actividad diaria (pasos / minutos activos), cargada a mano.
CREATE TABLE "daily_activity" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "steps" INTEGER NOT NULL,
  "active_minutes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "daily_activity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "daily_activity_user_id_date_key" ON "daily_activity"("user_id", "date");
CREATE INDEX "daily_activity_user_id_date_idx" ON "daily_activity"("user_id", "date");

ALTER TABLE "daily_activity"
  ADD CONSTRAINT "daily_activity_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON "daily_activity"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE "daily_activity" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_activity_owner" ON "daily_activity"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
