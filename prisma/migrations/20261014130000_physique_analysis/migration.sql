-- Análisis de físico por foto (IA). Sólo se guarda el informe en texto;
-- las fotos nunca se almacenan.

CREATE TABLE "physique_analysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "report" JSONB NOT NULL,
  "photo_count" INTEGER NOT NULL DEFAULT 1,
  "note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "physique_analysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "physique_analysis_user_id_created_at_idx"
  ON "physique_analysis"("user_id", "created_at");

ALTER TABLE "physique_analysis"
  ADD CONSTRAINT "physique_analysis_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: cada quien ve sólo lo suyo.
ALTER TABLE "physique_analysis" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "physique_analysis_owner" ON "physique_analysis"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
