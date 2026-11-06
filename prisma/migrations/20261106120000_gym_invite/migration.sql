-- Invitaciones de socios por mail (las carga el gimnasio, las aprueba el admin).
CREATE TABLE "gym_invite" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "gym_invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_invite_gym_id_email_key" ON "gym_invite"("gym_id", "email");
CREATE INDEX "gym_invite_status_idx" ON "gym_invite"("status");
CREATE INDEX "gym_invite_email_idx" ON "gym_invite"("email");
ALTER TABLE "gym_invite" ADD CONSTRAINT "gym_invite_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor la usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_invite" ENABLE ROW LEVEL SECURITY;
