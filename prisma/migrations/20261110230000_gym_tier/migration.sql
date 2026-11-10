-- Plan GYM (US$4,99/mes en las tiendas): mismos límites que un socio de gimnasio.
-- ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción que ya use el nuevo valor, así que esta migración no hace nada más.
ALTER TYPE "EntitlementTier" ADD VALUE IF NOT EXISTS 'GYM';
