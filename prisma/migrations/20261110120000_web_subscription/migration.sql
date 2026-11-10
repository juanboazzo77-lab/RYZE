-- Plan mensual que una persona paga directo por la web (Mercado Pago, en pesos). Una por persona.
CREATE TABLE "web_subscription" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MERCADOPAGO',
    "provider_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gym_id" UUID,
    "next_payment_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "web_subscription_user_id_key" ON "web_subscription"("user_id");
CREATE UNIQUE INDEX "web_subscription_provider_id_key" ON "web_subscription"("provider_id");
CREATE INDEX "web_subscription_status_idx" ON "web_subscription"("status");
ALTER TABLE "web_subscription" ADD CONSTRAINT "web_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "web_subscription" ADD CONSTRAINT "web_subscription_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sólo el servidor la usa (sin política = nadie desde el navegador).
ALTER TABLE "web_subscription" ENABLE ROW LEVEL SECURITY;
