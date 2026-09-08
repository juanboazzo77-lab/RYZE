-- Web Push: suscripciones de navegador + destino de click en la notificación.

ALTER TABLE "notification" ADD COLUMN "url" TEXT;
CREATE INDEX "notification_sent_at_idx" ON "notification"("sent_at");

CREATE TABLE "push_subscription" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");
CREATE INDEX "push_subscription_user_id_idx" ON "push_subscription"("user_id");

ALTER TABLE "push_subscription"
  ADD CONSTRAINT "push_subscription_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- updated_at automático (misma función que el resto de las tablas).
CREATE TRIGGER set_updated_at BEFORE UPDATE ON "push_subscription"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: cada quien ve sólo sus suscripciones.
ALTER TABLE "push_subscription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_subscription_owner" ON "push_subscription"
  FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid());
