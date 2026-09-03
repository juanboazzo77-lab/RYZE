-- =====================================================================
-- 0001_init — Bloque manual (NO generado por Prisma)
-- Extensiones · FK a auth.users · triggers · índices de búsqueda · RLS
-- =====================================================================

-- --- Extensiones ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- --- FK profile.id -> auth.users.id -----------------------------------
ALTER TABLE "profile"
  ADD CONSTRAINT "profile_id_fkey"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- --- Alta de usuario: crea profile + entitlement --------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."profile" ("id", "email", "name", "updated_at")
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    now()
  )
  ON CONFLICT ("id") DO NOTHING;

  INSERT INTO public."entitlement" ("user_id", "updated_at")
  VALUES (NEW.id, now())
  ON CONFLICT ("user_id") DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --- updated_at automático ----------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profile','goal','nutrition_target','entitlement','food','food_entry','meal',
    'exercise','workout_plan','plan_day','workout','weight_entry','ai_conversation',
    'weekly_checkin','user_achievement','notification_preference'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- --- Índices de búsqueda (trigram) -----------------------------
CREATE INDEX IF NOT EXISTS "food_name_trgm_idx" ON "food" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "exercise_name_trgm_idx" ON "exercise" USING gin ("name" gin_trgm_ops);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Prisma se conecta con un rol BYPASSRLS; estas políticas protegen el
-- acceso directo vía PostgREST / anon key. La barrera primaria de la app
-- es forUser() (src/server/user-db.ts).
-- =====================================================================

ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_self" ON "profile";
CREATE POLICY "profile_self" ON "profile" FOR ALL
  USING ("id" = auth.uid()) WITH CHECK ("id" = auth.uid());

-- Tablas con user_id directo
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'goal','nutrition_target','entitlement','food_entry','meal','workout_plan',
    'workout','personal_record','weight_entry','ai_conversation','ai_generation',
    'ai_action_draft','ai_usage_daily','weekly_checkin','user_achievement',
    'notification_preference','notification'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING ("user_id" = auth.uid()) WITH CHECK ("user_id" = auth.uid())',
      t || '_owner', t
    );
  END LOOP;
END $$;

-- Tablas hijas (sin user_id): se scopean por el padre
ALTER TABLE "meal_item" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meal_item_owner" ON "meal_item";
CREATE POLICY "meal_item_owner" ON "meal_item" FOR ALL
  USING (EXISTS (SELECT 1 FROM "meal" m WHERE m."id" = "meal_item"."meal_id" AND m."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "meal" m WHERE m."id" = "meal_item"."meal_id" AND m."user_id" = auth.uid()));

ALTER TABLE "plan_day" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_day_owner" ON "plan_day";
CREATE POLICY "plan_day_owner" ON "plan_day" FOR ALL
  USING (EXISTS (SELECT 1 FROM "workout_plan" p WHERE p."id" = "plan_day"."plan_id" AND p."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "workout_plan" p WHERE p."id" = "plan_day"."plan_id" AND p."user_id" = auth.uid()));

ALTER TABLE "plan_exercise" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_exercise_owner" ON "plan_exercise";
CREATE POLICY "plan_exercise_owner" ON "plan_exercise" FOR ALL
  USING (EXISTS (SELECT 1 FROM "plan_day" d JOIN "workout_plan" p ON p."id" = d."plan_id" WHERE d."id" = "plan_exercise"."plan_day_id" AND p."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "plan_day" d JOIN "workout_plan" p ON p."id" = d."plan_id" WHERE d."id" = "plan_exercise"."plan_day_id" AND p."user_id" = auth.uid()));

ALTER TABLE "workout_exercise" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workout_exercise_owner" ON "workout_exercise";
CREATE POLICY "workout_exercise_owner" ON "workout_exercise" FOR ALL
  USING (EXISTS (SELECT 1 FROM "workout" w WHERE w."id" = "workout_exercise"."workout_id" AND w."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "workout" w WHERE w."id" = "workout_exercise"."workout_id" AND w."user_id" = auth.uid()));

ALTER TABLE "workout_set" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workout_set_owner" ON "workout_set";
CREATE POLICY "workout_set_owner" ON "workout_set" FOR ALL
  USING (EXISTS (SELECT 1 FROM "workout_exercise" we JOIN "workout" w ON w."id" = we."workout_id" WHERE we."id" = "workout_set"."workout_exercise_id" AND w."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "workout_exercise" we JOIN "workout" w ON w."id" = we."workout_id" WHERE we."id" = "workout_set"."workout_exercise_id" AND w."user_id" = auth.uid()));

ALTER TABLE "ai_message" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_message_owner" ON "ai_message";
CREATE POLICY "ai_message_owner" ON "ai_message" FOR ALL
  USING (EXISTS (SELECT 1 FROM "ai_conversation" c WHERE c."id" = "ai_message"."conversation_id" AND c."user_id" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM "ai_conversation" c WHERE c."id" = "ai_message"."conversation_id" AND c."user_id" = auth.uid()));

-- Bibliotecas: lectura para autenticados, escritura sólo de lo propio
ALTER TABLE "food" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "food_read" ON "food";
DROP POLICY IF EXISTS "food_write_own" ON "food";
DROP POLICY IF EXISTS "food_update_own" ON "food";
DROP POLICY IF EXISTS "food_delete_own" ON "food";
CREATE POLICY "food_read" ON "food" FOR SELECT TO authenticated USING (true);
CREATE POLICY "food_write_own" ON "food" FOR INSERT TO authenticated WITH CHECK ("created_by" = auth.uid());
CREATE POLICY "food_update_own" ON "food" FOR UPDATE TO authenticated USING ("created_by" = auth.uid()) WITH CHECK ("created_by" = auth.uid());
CREATE POLICY "food_delete_own" ON "food" FOR DELETE TO authenticated USING ("created_by" = auth.uid());

ALTER TABLE "exercise" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exercise_read" ON "exercise";
DROP POLICY IF EXISTS "exercise_write_own" ON "exercise";
DROP POLICY IF EXISTS "exercise_update_own" ON "exercise";
DROP POLICY IF EXISTS "exercise_delete_own" ON "exercise";
CREATE POLICY "exercise_read" ON "exercise" FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_write_own" ON "exercise" FOR INSERT TO authenticated WITH CHECK ("created_by" = auth.uid());
CREATE POLICY "exercise_update_own" ON "exercise" FOR UPDATE TO authenticated USING ("created_by" = auth.uid()) WITH CHECK ("created_by" = auth.uid());
CREATE POLICY "exercise_delete_own" ON "exercise" FOR DELETE TO authenticated USING ("created_by" = auth.uid());

-- Catálogo de logros: lectura para autenticados
ALTER TABLE "achievement" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievement_read" ON "achievement";
CREATE POLICY "achievement_read" ON "achievement" FOR SELECT TO authenticated USING (true);
