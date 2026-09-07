-- Búsqueda de alimentos por código de barras (Open Food Facts u otros).
-- `external_id` guarda el código EAN/UPC. Único cuando está presente; en
-- Postgres los NULL no colisionan entre sí, así que los alimentos SYSTEM
-- (sin código) no se ven afectados.
CREATE UNIQUE INDEX "food_external_id_key" ON "food"("external_id");
