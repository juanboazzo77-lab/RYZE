-- Plan de entrada BASIC ($2.99/mes): mensajes/planes limitados, sin anuncios.
-- Se ofrece después de que termina la prueba gratis de FREE (7 días, ver
-- TRIAL_DAYS en src/server/entitlements.ts).
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción que ya use
-- el nuevo valor, así que esta migración no hace nada más.
ALTER TYPE "EntitlementTier" ADD VALUE 'BASIC';
