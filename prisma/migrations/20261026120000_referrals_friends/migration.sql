-- Invitaciones y amigos: código personal, quién invitó a quién, días de regalo y amistades.

-- Código para invitar / agregar amigos, y quién invitó a la persona.
ALTER TABLE "profile" ADD COLUMN "referral_code" TEXT,
ADD COLUMN "referred_by_id" UUID;

CREATE UNIQUE INDEX "profile_referral_code_key" ON "profile"("referral_code");
CREATE INDEX "profile_referred_by_id_idx" ON "profile"("referred_by_id");

ALTER TABLE "profile" ADD CONSTRAINT "profile_referred_by_id_fkey"
  FOREIGN KEY ("referred_by_id") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Días de acceso completo regalados por invitar (se suman a la prueba gratis).
ALTER TABLE "entitlement" ADD COLUMN "bonus_until" TIMESTAMP(3);

-- Amistades.
CREATE TABLE "friendship" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requester_id" UUID NOT NULL,
  "addressee_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "friendship_addressee_id_idx" ON "friendship"("addressee_id");
CREATE UNIQUE INDEX "friendship_requester_id_addressee_id_key"
  ON "friendship"("requester_id", "addressee_id");

ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_id_fkey"
  FOREIGN KEY ("requester_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_addressee_id_fkey"
  FOREIGN KEY ("addressee_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: cada quien ve sólo las amistades en las que participa.
ALTER TABLE "friendship" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendship_participant" ON "friendship"
  FOR ALL USING ("requester_id" = auth.uid() OR "addressee_id" = auth.uid())
  WITH CHECK ("requester_id" = auth.uid() OR "addressee_id" = auth.uid());
