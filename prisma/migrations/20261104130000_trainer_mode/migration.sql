-- Modo entrenador (piloto): perfil del entrenador y vinculo con sus clientes (con consentimiento).

CREATE TABLE "trainer_profile" (
  "user_id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "bio" TEXT,
  "credential" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "invite_code" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trainer_profile_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "trainer_profile_invite_code_key" ON "trainer_profile"("invite_code");

ALTER TABLE "trainer_profile"
  ADD CONSTRAINT "trainer_profile_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "trainer_client" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "trainer_id" UUID NOT NULL,
  "client_id" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "consent_at" TIMESTAMP(3) NOT NULL,
  "ended_at" TIMESTAMP(3),
  "ended_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trainer_client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trainer_client_trainer_id_client_id_key" ON "trainer_client"("trainer_id", "client_id");
CREATE INDEX "trainer_client_client_id_idx" ON "trainer_client"("client_id");
-- Cada cliente tiene, como maximo, un entrenador activo a la vez.
CREATE UNIQUE INDEX "trainer_client_one_active_per_client" ON "trainer_client"("client_id") WHERE "status" = 'ACTIVE';

ALTER TABLE "trainer_client"
  ADD CONSTRAINT "trainer_client_trainer_id_fkey"
  FOREIGN KEY ("trainer_id") REFERENCES "trainer_profile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trainer_client"
  ADD CONSTRAINT "trainer_client_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: el entrenador ve su perfil; el vinculo lo ven solo las dos personas.
ALTER TABLE "trainer_profile" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_profile_owner" ON "trainer_profile"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());

ALTER TABLE "trainer_client" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_client_participant" ON "trainer_client"
  FOR ALL USING ("trainer_id" = auth.uid() OR "client_id" = auth.uid())
  WITH CHECK ("trainer_id" = auth.uid() OR "client_id" = auth.uid());
