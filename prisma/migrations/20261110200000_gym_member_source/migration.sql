-- De dónde viene el socio: INVITE (código o invitación del gimnasio; el gimnasio paga por él) o WEB (pagó su plan por
-- la web con Mercado Pago; no se le cobra al gimnasio ni ocupa cupo). Aditiva.
ALTER TABLE "gym_member" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'INVITE';
