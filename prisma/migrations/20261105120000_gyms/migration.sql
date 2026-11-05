-- Gimnasios y sus socios (alta con aprobacion manual y cupo de socios).
CREATE TABLE "gym" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "contact_name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "member_estimate" INTEGER,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "member_limit" INTEGER NOT NULL DEFAULT 0,
    "invite_code" TEXT,
    "equipment" JSONB,
    "specialty" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "gym_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_invite_code_key" ON "gym"("invite_code");
CREATE INDEX "gym_status_idx" ON "gym"("status");

CREATE TABLE "gym_member" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "gym_member_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_member_user_id_key" ON "gym_member"("user_id");
CREATE INDEX "gym_member_gym_id_status_idx" ON "gym_member"("gym_id", "status");

ALTER TABLE "gym_member" ADD CONSTRAINT "gym_member_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_member" ADD CONSTRAINT "gym_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Los gimnasios los maneja sólo el servidor (sin política = nadie desde el navegador).
ALTER TABLE "gym" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_member" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gym_member_owner" ON "gym_member"
  FOR SELECT USING ("user_id" = auth.uid());
