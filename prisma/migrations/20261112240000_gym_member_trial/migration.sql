-- Prueba de 3 días para quien entra a un gimnasio con el código (source = 'CODE'): hasta cuándo dura.
-- Vacía para el resto de los socios. Aditiva.
ALTER TABLE "gym_member" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
