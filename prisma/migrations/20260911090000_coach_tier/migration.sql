-- Plan más top: COACH. Desbloquea el perfil de coaching (src/features/coach-profile)
-- y la individualización a medida en los planes que arma la IA.
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción que ya use
-- el nuevo valor, así que esta migración no hace nada más.
ALTER TYPE "EntitlementTier" ADD VALUE 'COACH';
