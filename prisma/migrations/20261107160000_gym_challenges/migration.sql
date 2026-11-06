-- Retos del gimnasio: un desafío entre sus socios y quiénes se sumaron.
CREATE TABLE "gym_challenge" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT NOT NULL DEFAULT 'WORKOUTS',
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "prize" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_challenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_challenge_gym_id_ends_on_idx" ON "gym_challenge"("gym_id", "ends_on");
ALTER TABLE "gym_challenge" ADD CONSTRAINT "gym_challenge_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gym_challenge_entry" (
    "id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_challenge_entry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_challenge_entry_challenge_id_user_id_key" ON "gym_challenge_entry"("challenge_id", "user_id");
CREATE INDEX "gym_challenge_entry_user_id_idx" ON "gym_challenge_entry"("user_id");
ALTER TABLE "gym_challenge_entry" ADD CONSTRAINT "gym_challenge_entry_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "gym_challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_challenge_entry" ADD CONSTRAINT "gym_challenge_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor las usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_challenge_entry" ENABLE ROW LEVEL SECURITY;
