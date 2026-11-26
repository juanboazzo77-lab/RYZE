-- Idioma y unidades se pueden cambiar desde la web y desde la app sin senal: hace falta saber cual cambio se hizo despues.
-- Es aditivo: queda vacio en las cuentas actuales y no se reescribe nada.
ALTER TABLE "profile" ADD COLUMN IF NOT EXISTS "prefs_edited_at" TIMESTAMP(3);
