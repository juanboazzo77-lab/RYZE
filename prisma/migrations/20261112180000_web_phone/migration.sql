-- El teléfono (WhatsApp) que la persona da al activar su plan desde la página del gimnasio: así el gimnasio la
-- identifica y la vincula con su lista de clientes. Aditiva.
ALTER TABLE "web_subscription" ADD COLUMN "phone" TEXT;
