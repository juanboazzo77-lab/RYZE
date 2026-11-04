-- Cuentas separadas: cliente o entrenador. Las que ya tienen perfil de entrenador pasan a ser de entrenador.
ALTER TABLE "profile" ADD COLUMN "account_type" TEXT NOT NULL DEFAULT 'CLIENT';
UPDATE "profile" SET "account_type" = 'TRAINER' WHERE "id" IN (SELECT "user_id" FROM "trainer_profile");
