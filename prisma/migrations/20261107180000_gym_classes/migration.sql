-- Clases del gimnasio con reserva: cada clase se repite un día de la semana a la misma hora.
CREATE TABLE "gym_class" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "instructor" TEXT,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 60,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_class_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_class_gym_id_active_idx" ON "gym_class"("gym_id", "active");
ALTER TABLE "gym_class" ADD CONSTRAINT "gym_class_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Una reserva de un socio para UNA fecha concreta de una clase (BOOKED o CANCELLED).
CREATE TABLE "gym_booking" (
    "id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "gym_booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gym_booking_class_id_user_id_date_key" ON "gym_booking"("class_id", "user_id", "date");
CREATE INDEX "gym_booking_class_id_date_status_idx" ON "gym_booking"("class_id", "date", "status");
CREATE INDEX "gym_booking_user_id_date_idx" ON "gym_booking"("user_id", "date");
ALTER TABLE "gym_booking" ADD CONSTRAINT "gym_booking_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "gym_class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gym_booking" ADD CONSTRAINT "gym_booking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor las usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_class" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gym_booking" ENABLE ROW LEVEL SECURITY;
