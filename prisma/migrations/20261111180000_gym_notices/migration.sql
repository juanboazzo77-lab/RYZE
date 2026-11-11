-- Avisos del administrador a los gimnasios (a todos o a algunos) y quién los leyó. Aditiva.
CREATE TABLE "gym_notice" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "gym_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "sent_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_notice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_notice_created_at_idx" ON "gym_notice"("created_at");

CREATE TABLE "gym_notice_read" (
    "notice_id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_notice_read_pkey" PRIMARY KEY ("notice_id", "gym_id")
);

CREATE INDEX "gym_notice_read_gym_id_idx" ON "gym_notice_read"("gym_id");
ALTER TABLE "gym_notice_read" ADD CONSTRAINT "gym_notice_read_notice_id_fkey" FOREIGN KEY ("notice_id") REFERENCES "gym_notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_notice_read" ADD CONSTRAINT "gym_notice_read_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor las usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_notice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_notice_read" ENABLE ROW LEVEL SECURITY;
