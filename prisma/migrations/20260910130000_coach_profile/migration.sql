-- Perfil de coaching detallado (preferencias del cliente). 1:1 con profile.
-- Cada sección es un JSON validado por Zod en la app. Todo opcional.

CREATE TABLE "coach_profile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "health" JSONB NOT NULL DEFAULT '{}',
  "food" JSONB NOT NULL DEFAULT '{}',
  "training" JSONB NOT NULL DEFAULT '{}',
  "goal" JSONB NOT NULL DEFAULT '{}',
  "lifestyle" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coach_profile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coach_profile_user_id_key" ON "coach_profile"("user_id");

ALTER TABLE "coach_profile"
  ADD CONSTRAINT "coach_profile_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- updated_at automático
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "coach_profile"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: cada quien ve sólo lo suyo.
ALTER TABLE "coach_profile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_profile_owner" ON "coach_profile"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
