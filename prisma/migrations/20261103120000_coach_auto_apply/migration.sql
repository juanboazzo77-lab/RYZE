-- El cliente elige si los cambios que le pide al coach se aplican solos o con el boton "Editar".
ALTER TABLE "profile" ADD COLUMN "coach_auto_apply" BOOLEAN NOT NULL DEFAULT false;
