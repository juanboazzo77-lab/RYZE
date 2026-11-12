-- Aviso del gimnasio a sus clientes como notificación. ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción
-- que ya use el nuevo valor, así que esta migración no hace nada más.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'GYM_MESSAGE';
