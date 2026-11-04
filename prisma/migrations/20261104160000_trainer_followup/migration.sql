-- Modo entrenador: permiso de edicion del cliente y seguimiento 1 a 1 (notas, feedback, proximo seguimiento).

ALTER TABLE "trainer_client"
  ADD COLUMN "edit_consent_at" TIMESTAMP(3),
  ADD COLUMN "edit_requested_at" TIMESTAMP(3),
  ADD COLUMN "next_follow_up" DATE;

CREATE TABLE "trainer_note" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "link_id" UUID NOT NULL,
  "author_id" UUID NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'NOTE',
  "checkin_id" UUID,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trainer_note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trainer_note_link_id_created_at_idx" ON "trainer_note"("link_id", "created_at");

ALTER TABLE "trainer_note"
  ADD CONSTRAINT "trainer_note_link_id_fkey"
  FOREIGN KEY ("link_id") REFERENCES "trainer_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: sólo el entrenador del vínculo ve sus notas (el cliente no las ve).
ALTER TABLE "trainer_note" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_note_trainer" ON "trainer_note"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "trainer_client" tc WHERE tc."id" = "trainer_note"."link_id" AND tc."trainer_id" = auth.uid())
  ) WITH CHECK (
    "author_id" = auth.uid() AND EXISTS (SELECT 1 FROM "trainer_client" tc WHERE tc."id" = "trainer_note"."link_id" AND tc."trainer_id" = auth.uid())
  );
