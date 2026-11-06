-- Gestión del gimnasio: sus clientes y el control de sus cuotas.
CREATE TABLE "gym_client" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "fee_amount" DECIMAL(12,2),
    "paid_until" DATE,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_client_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_client_gym_id_active_idx" ON "gym_client"("gym_id", "active");
CREATE INDEX "gym_client_email_idx" ON "gym_client"("email");
ALTER TABLE "gym_client" ADD CONSTRAINT "gym_client_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "gym_client_payment" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "paid_on" DATE NOT NULL,
    "amount" DECIMAL(12,2),
    "months" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_client_payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_client_payment_client_id_idx" ON "gym_client_payment"("client_id");
ALTER TABLE "gym_client_payment" ADD CONSTRAINT "gym_client_payment_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "gym_client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor las usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_client_payment" ENABLE ROW LEVEL SECURITY;
