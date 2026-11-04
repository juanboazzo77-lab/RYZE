-- Memoria del coach: lo que el usuario le contó y conviene recordar (lesiones, gustos, horarios).

CREATE TABLE "coach_memory" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'OTHER',
  "content" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CHAT',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "coach_memory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "coach_memory_user_id_created_at_idx"
  ON "coach_memory"("user_id", "created_at");

ALTER TABLE "coach_memory"
  ADD CONSTRAINT "coach_memory_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: cada quien ve sólo lo suyo.
ALTER TABLE "coach_memory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coach_memory_owner" ON "coach_memory"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
