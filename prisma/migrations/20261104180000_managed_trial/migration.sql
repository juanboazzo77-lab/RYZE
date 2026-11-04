-- Un cliente que deja de estar manejado por un entrenador tiene 3 dias gratis (una sola vez) y despues paga.
ALTER TABLE "entitlement" ADD COLUMN "managed_trial_granted_at" TIMESTAMP(3);
