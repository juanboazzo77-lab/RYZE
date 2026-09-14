-- Más idiomas: portugués, francés, alemán, italiano. ALTER TYPE ... ADD VALUE
-- no puede usarse en la misma transacción que ya use el valor nuevo, así que
-- esta migración no hace nada más.
ALTER TYPE "Locale" ADD VALUE 'PT';
ALTER TYPE "Locale" ADD VALUE 'FR';
ALTER TYPE "Locale" ADD VALUE 'DE';
ALTER TYPE "Locale" ADD VALUE 'IT';
