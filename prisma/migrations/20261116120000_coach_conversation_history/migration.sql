-- Historial del chat con la IA: las conversaciones ya no se borran, se archivan con un nombre.
-- Cambio aditivo: dos columnas nuevas y un índice. `title` pasa a ser el nombre legible de la conversación.
ALTER TABLE "ai_conversation" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "ai_conversation" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

-- Las charlas por tema que ya existían guardaban el tema en `title`: se pasa a `topic` y el nombre se arma después.
UPDATE "ai_conversation" SET "topic" = "title" WHERE "title" IN ('training', 'nutrition', 'progress', 'health', 'general');
UPDATE "ai_conversation" SET "title" = NULL WHERE "topic" IS NOT NULL AND "title" = "topic";

CREATE INDEX IF NOT EXISTS "ai_conversation_user_id_kind_archived_at_idx" ON "ai_conversation"("user_id", "kind", "archived_at");
