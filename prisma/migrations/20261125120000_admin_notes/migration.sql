-- Buzon del administrador (errores y mejoras anotados desde el panel). Aditiva.
CREATE TABLE IF NOT EXISTS "admin_note" (
  "id" UUID NOT NULL,
  "kind" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "photo_path" TEXT,
  "reply" TEXT,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_note_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "admin_note_status_created_at_idx" ON "admin_note" ("status", "created_at");
-- Sin politicas: nadie entra por la API publica de Supabase, solo el servidor.
ALTER TABLE "admin_note" ENABLE ROW LEVEL SECURITY;
