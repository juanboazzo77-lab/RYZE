-- Chat entre entrenador y cliente (piloto del modo entrenador).

CREATE TABLE "trainer_message" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "link_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "read_at" TIMESTAMP(3),
  CONSTRAINT "trainer_message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trainer_message_link_id_created_at_idx" ON "trainer_message"("link_id", "created_at");

ALTER TABLE "trainer_message"
  ADD CONSTRAINT "trainer_message_link_id_fkey"
  FOREIGN KEY ("link_id") REFERENCES "trainer_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Intentos de pasar datos de contacto que el filtro frenó (sin guardar el texto).
CREATE TABLE "trainer_message_block" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "link_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trainer_message_block_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trainer_message_block_sender_id_created_at_idx" ON "trainer_message_block"("sender_id", "created_at");
CREATE INDEX "trainer_message_block_link_id_idx" ON "trainer_message_block"("link_id");

ALTER TABLE "trainer_message_block"
  ADD CONSTRAINT "trainer_message_block_link_id_fkey"
  FOREIGN KEY ("link_id") REFERENCES "trainer_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: sólo las dos personas del vínculo ven los mensajes.
ALTER TABLE "trainer_message" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_message_participant" ON "trainer_message"
  FOR ALL USING (
    EXISTS (SELECT 1 FROM "trainer_client" tc
            WHERE tc."id" = "trainer_message"."link_id"
              AND (tc."trainer_id" = auth.uid() OR tc."client_id" = auth.uid()))
  ) WITH CHECK (
    "sender_id" = auth.uid() AND EXISTS (SELECT 1 FROM "trainer_client" tc
            WHERE tc."id" = "trainer_message"."link_id"
              AND (tc."trainer_id" = auth.uid() OR tc."client_id" = auth.uid()))
  );

-- Los intentos bloqueados los lee sólo el servicio (sin policy para usuarios).
ALTER TABLE "trainer_message_block" ENABLE ROW LEVEL SECURITY;
