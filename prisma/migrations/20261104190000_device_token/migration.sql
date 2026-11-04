-- Tokens de notificaciones remotas de la app nativa (APNs).
CREATE TABLE "device_token" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ios',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "device_token_token_key" ON "device_token"("token");
CREATE INDEX "device_token_user_id_idx" ON "device_token"("user_id");

ALTER TABLE "device_token" ADD CONSTRAINT "device_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "device_token" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "device_token_owner" ON "device_token"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
