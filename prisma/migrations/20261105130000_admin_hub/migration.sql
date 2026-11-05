-- Centro de gestion: cobros a gimnasios y registro de errores.
ALTER TABLE "gym" ADD COLUMN "price_per_member_usd" DECIMAL(8,2) NOT NULL DEFAULT 1.50;

CREATE TABLE "gym_payment" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "members" INTEGER NOT NULL,
    "price_per_member_usd" DECIMAL(8,2) NOT NULL,
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_payment_gym_id_period_key" ON "gym_payment"("gym_id", "period");
CREATE INDEX "gym_payment_status_due_date_idx" ON "gym_payment"("status", "due_date");
ALTER TABLE "gym_payment" ADD CONSTRAINT "gym_payment_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "app_error" (
    "id" UUID NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "digest" TEXT,
    "user_id" UUID,
    "user_agent" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "app_error_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_error_fingerprint_key" ON "app_error"("fingerprint");
CREATE INDEX "app_error_status_last_seen_idx" ON "app_error"("status", "last_seen");

-- Sólo el servidor los usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_error" ENABLE ROW LEVEL SECURITY;
