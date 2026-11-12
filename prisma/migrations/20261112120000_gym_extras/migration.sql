-- Extras del gimnasio: mensajes del dueño a sus clientes, recordatorios automáticos de cuota, lista de espera de las
-- clases y accesos para el equipo (recepción y profes). Aditiva.

-- 1. Mensajes del gimnasio a sus clientes.
CREATE TABLE "gym_message" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "gym_message_gym_id_created_at_idx" ON "gym_message"("gym_id", "created_at");
ALTER TABLE "gym_message" ADD CONSTRAINT "gym_message_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Recordatorios de cuota al cliente (apagados hasta que el dueño los prenda) y cuándo se mandó el último.
ALTER TABLE "gym" ADD COLUMN "client_reminders" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "gym_client" ADD COLUMN "last_reminder_on" DATE;

-- 3. Lista de espera de una clase en una fecha.
CREATE TABLE "gym_waitlist" (
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_waitlist_pkey" PRIMARY KEY ("class_id", "user_id", "date")
);
CREATE INDEX "gym_waitlist_class_id_date_created_at_idx" ON "gym_waitlist"("class_id", "date", "created_at");
CREATE INDEX "gym_waitlist_user_id_idx" ON "gym_waitlist"("user_id");
ALTER TABLE "gym_waitlist" ADD CONSTRAINT "gym_waitlist_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "gym_class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_waitlist" ADD CONSTRAINT "gym_waitlist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Equipo del gimnasio: recepción y profes con permisos limitados (se entra con el mail).
CREATE TABLE "gym_staff" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_staff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gym_staff_gym_id_email_key" ON "gym_staff"("gym_id", "email");
CREATE INDEX "gym_staff_email_idx" ON "gym_staff"("email");
ALTER TABLE "gym_staff" ADD CONSTRAINT "gym_staff_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor las usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_waitlist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_staff" ENABLE ROW LEVEL SECURITY;
