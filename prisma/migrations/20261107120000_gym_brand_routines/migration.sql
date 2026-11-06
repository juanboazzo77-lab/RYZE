-- Marca propia del gimnasio (logo y color) y sus rutinas oficiales.
ALTER TABLE "gym" ADD COLUMN "brand_color" TEXT;
ALTER TABLE "gym" ADD COLUMN "logo_url" TEXT;

CREATE TABLE "gym_routine" (
    "id" UUID NOT NULL,
    "gym_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT,
    "days" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gym_routine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "gym_routine_gym_id_active_idx" ON "gym_routine"("gym_id", "active");
ALTER TABLE "gym_routine" ADD CONSTRAINT "gym_routine_gym_id_fkey" FOREIGN KEY ("gym_id") REFERENCES "gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sólo el servidor la usa (sin política = nadie desde el navegador).
ALTER TABLE "gym_routine" ENABLE ROW LEVEL SECURITY;

-- Depósito público para los logos (se leen en la app). Si Supabase no deja crearlo desde acá, el panel lo crea
-- la primera vez que se sube un logo: no debe frenar el despliegue.
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) VALUES ('gym-logos', 'gym-logos', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;
