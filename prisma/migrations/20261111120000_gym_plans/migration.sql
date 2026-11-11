-- Planes de pago del gimnasio (por ejemplo "Pase libre" o "3 veces por semana") y a qué clases da acceso cada uno.
-- `class_names` son los nombres (tipos) de clase incluidos cuando `classes_mode` es SELECTED. Aditiva.
CREATE TABLE "gym_plan" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2),
    "classes_mode" TEXT NOT NULL DEFAULT 'ALL',
    "class_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weekly_limit" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gym_plan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_plan_gym_id_active_idx" ON "gym_plan"("gym_id", "active");
ALTER TABLE "gym_plan" ADD CONSTRAINT "gym_plan_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gym_client" ADD COLUMN "plan_id" UUID;
CREATE INDEX "gym_client_plan_id_idx" ON "gym_client"("plan_id");
ALTER TABLE "gym_client" ADD CONSTRAINT "gym_client_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "gym_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sólo el servidor la usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_plan" ENABLE ROW LEVEL SECURITY;
