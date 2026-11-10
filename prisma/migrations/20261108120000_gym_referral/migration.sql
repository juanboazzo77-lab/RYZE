-- De qué gimnasio vino cada persona que activó su plan por la web (QR del gimnasio).
CREATE TABLE "gym_referral" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_referral_user_id_key" ON "gym_referral"("user_id");
CREATE INDEX "gym_referral_gym_id_idx" ON "gym_referral"("gym_id");
ALTER TABLE "gym_referral" ADD CONSTRAINT "gym_referral_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_referral" ADD CONSTRAINT "gym_referral_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor la usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_referral" ENABLE ROW LEVEL SECURITY;
