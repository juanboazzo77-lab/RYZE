-- Deportes del usuario + competencias. El AI Coach programa gimnasio y
-- nutrición alrededor de estas sesiones y eventos.

CREATE TABLE "sport_profile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "level" TEXT,
  "sessions_per_week" INTEGER NOT NULL DEFAULT 3,
  "session_days" JSONB NOT NULL DEFAULT '[]',
  "goal" TEXT,
  "notes" TEXT,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sport_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "competition" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "sport_profile_id" UUID,
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'B',
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "competition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sport_profile_user_id_idx" ON "sport_profile"("user_id");
CREATE INDEX "competition_user_id_date_idx" ON "competition"("user_id", "date");

ALTER TABLE "sport_profile"
  ADD CONSTRAINT "sport_profile_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition"
  ADD CONSTRAINT "competition_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "competition"
  ADD CONSTRAINT "competition_sport_profile_id_fkey"
  FOREIGN KEY ("sport_profile_id") REFERENCES "sport_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- updated_at automático
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "sport_profile"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "competition"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: cada quien ve sólo lo suyo.
ALTER TABLE "sport_profile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sport_profile_owner" ON "sport_profile"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
ALTER TABLE "competition" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competition_owner" ON "competition"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
