-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('ES', 'EN');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "PrimaryGoal" AS ENUM ('LOSE_FAT', 'GAIN_MUSCLE', 'RECOMP', 'MAINTAIN', 'STRENGTH', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "TrainingPlace" AS ENUM ('GYM', 'HOME', 'BOTH');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'ABANDONED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "NutritionTargetSource" AS ENUM ('MANUAL', 'CALCULATED', 'AI');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'MERIENDA', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('SYSTEM', 'USER', 'API');

-- CreateEnum
CREATE TYPE "FoodEntrySource" AS ENUM ('MANUAL', 'AI_PARSE', 'FREQUENT', 'COPIED');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'BACK', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES', 'ABS', 'TRAPS', 'FULL_BODY', 'OTHER');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('MANUAL', 'AI');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PrType" AS ENUM ('MAX_WEIGHT', 'MAX_REPS', 'MAX_VOLUME', 'EST_1RM');

-- CreateEnum
CREATE TYPE "EntitlementTier" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AiConversationKind" AS ENUM ('COACH', 'PLAN_INTERVIEW', 'CHECKIN');

-- CreateEnum
CREATE TYPE "AiRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AiGenerationKind" AS ENUM ('WORKOUT_PLAN', 'NUTRITION_PLAN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AiGenerationStatus" AS ENUM ('DRAFT', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AiDraftKind" AS ENUM ('WORKOUT_PLAN', 'NUTRITION_TARGETS', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "AiDraftStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'APPLIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CheckinStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPLIED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('WEIGH_IN', 'WORKOUT_TODAY', 'LOG_MEALS', 'WEEKLY_CHECKIN', 'PROTEIN_GOAL', 'STREAK');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL', 'IN_APP');

-- CreateTable
CREATE TABLE "profile" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "sex" "Sex",
    "birthdate" DATE,
    "height_cm" DOUBLE PRECISION,
    "experience_level" "ExperienceLevel",
    "primary_goal" "PrimaryGoal",
    "training_place" "TrainingPlace",
    "activity_level" "ActivityLevel",
    "days_available" INTEGER,
    "session_minutes" INTEGER,
    "equipment" JSONB NOT NULL DEFAULT '[]',
    "dietary_prefs" JSONB NOT NULL DEFAULT '[]',
    "excluded_foods" JSONB NOT NULL DEFAULT '[]',
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "meals_per_day" INTEGER,
    "training_experience_note" TEXT,
    "injuries" TEXT,
    "locale" "Locale" NOT NULL DEFAULT 'ES',
    "unit_system" "UnitSystem" NOT NULL DEFAULT 'METRIC',
    "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    "week_start" INTEGER NOT NULL DEFAULT 1,
    "onboarding_completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "PrimaryGoal" NOT NULL,
    "start_weight_kg" DOUBLE PRECISION,
    "target_weight_kg" DOUBLE PRECISION,
    "weekly_rate_kg" DOUBLE PRECISION,
    "target_date" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_target" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein_g" INTEGER NOT NULL,
    "carbs_g" INTEGER NOT NULL,
    "fat_g" INTEGER NOT NULL,
    "source" "NutritionTargetSource" NOT NULL DEFAULT 'CALCULATED',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement" (
    "user_id" UUID NOT NULL,
    "tier" "EntitlementTier" NOT NULL DEFAULT 'FREE',
    "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_end" TIMESTAMP(3),
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entitlement_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "food" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "source" "FoodSource" NOT NULL DEFAULT 'USER',
    "external_id" TEXT,
    "created_by" UUID,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "kcal_per_100" DOUBLE PRECISION NOT NULL,
    "protein_per_100" DOUBLE PRECISION NOT NULL,
    "carbs_per_100" DOUBLE PRECISION NOT NULL,
    "fat_per_100" DOUBLE PRECISION NOT NULL,
    "serving_qty" DOUBLE PRECISION,
    "serving_unit" TEXT,
    "serving_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_entry" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal_type" "MealType" NOT NULL,
    "food_id" UUID,
    "custom_name" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "is_estimated" BOOLEAN NOT NULL DEFAULT false,
    "source" "FoodEntrySource" NOT NULL DEFAULT 'MANUAL',
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_item" (
    "id" UUID NOT NULL,
    "meal_id" UUID NOT NULL,
    "food_id" UUID,
    "custom_name" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "protein_g" DOUBLE PRECISION NOT NULL,
    "carbs_g" DOUBLE PRECISION NOT NULL,
    "fat_g" DOUBLE PRECISION NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "primary_muscle" "MuscleGroup" NOT NULL,
    "secondary_muscles" JSONB NOT NULL DEFAULT '[]',
    "equipment" TEXT,
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "source" "PlanSource" NOT NULL DEFAULT 'MANUAL',
    "ai_generation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_day" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "weekday" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_day_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_exercise" (
    "id" UUID NOT NULL,
    "plan_day_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "target_sets" INTEGER NOT NULL,
    "target_reps_min" INTEGER,
    "target_reps_max" INTEGER,
    "target_rir" DOUBLE PRECISION,
    "rest_seconds" INTEGER,
    "notes" TEXT,

    CONSTRAINT "plan_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID,
    "plan_day_id" UUID,
    "name" TEXT NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_for" DATE,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_seconds" INTEGER,
    "perceived_effort" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercise" (
    "id" UUID NOT NULL,
    "workout_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "order_index" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "workout_exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_set" (
    "id" UUID NOT NULL,
    "workout_exercise_id" UUID NOT NULL,
    "set_number" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "reps" INTEGER,
    "rir" DOUBLE PRECISION,
    "rpe" DOUBLE PRECISION,
    "is_warmup" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "workout_set_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_record" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "exercise_id" UUID NOT NULL,
    "type" "PrType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "workout_id" UUID,
    "achieved_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weight_entry" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiConversationKind" NOT NULL DEFAULT 'COACH',
    "title" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_message" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AiRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_generation" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiGenerationKind" NOT NULL,
    "input_hash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'DRAFT',
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_generation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_action_draft" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "AiDraftKind" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "AiDraftStatus" NOT NULL DEFAULT 'PROPOSED',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_draft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage_daily" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "task" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "message_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_checkin" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "avg_weight_kg" DOUBLE PRECISION,
    "weight_change_kg" DOUBLE PRECISION,
    "kcal_adherence_pct" DOUBLE PRECISION,
    "protein_adherence_pct" DOUBLE PRECISION,
    "workouts_completed" INTEGER NOT NULL DEFAULT 0,
    "workouts_planned" INTEGER NOT NULL DEFAULT 0,
    "hunger" INTEGER,
    "energy" INTEGER,
    "sleep" INTEGER,
    "training_feel" INTEGER,
    "adherence_note" TEXT,
    "notes" TEXT,
    "ai_summary" TEXT,
    "ai_proposal" JSONB,
    "status" "CheckinStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "threshold" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "user_achievement" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "time_of_day" TEXT,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_user_id_idx" ON "goal"("user_id");

-- CreateIndex
CREATE INDEX "goal_user_id_status_idx" ON "goal"("user_id", "status");

-- CreateIndex
CREATE INDEX "nutrition_target_user_id_idx" ON "nutrition_target"("user_id");

-- CreateIndex
CREATE INDEX "nutrition_target_user_id_active_idx" ON "nutrition_target"("user_id", "active");

-- CreateIndex
CREATE INDEX "food_created_by_idx" ON "food"("created_by");

-- CreateIndex
CREATE INDEX "food_source_idx" ON "food"("source");

-- CreateIndex
CREATE INDEX "food_entry_user_id_date_idx" ON "food_entry"("user_id", "date");

-- CreateIndex
CREATE INDEX "food_entry_food_id_idx" ON "food_entry"("food_id");

-- CreateIndex
CREATE INDEX "meal_user_id_idx" ON "meal"("user_id");

-- CreateIndex
CREATE INDEX "meal_item_meal_id_idx" ON "meal_item"("meal_id");

-- CreateIndex
CREATE INDEX "meal_item_food_id_idx" ON "meal_item"("food_id");

-- CreateIndex
CREATE INDEX "exercise_created_by_idx" ON "exercise"("created_by");

-- CreateIndex
CREATE INDEX "exercise_primary_muscle_idx" ON "exercise"("primary_muscle");

-- CreateIndex
CREATE INDEX "workout_plan_user_id_idx" ON "workout_plan"("user_id");

-- CreateIndex
CREATE INDEX "workout_plan_user_id_is_active_idx" ON "workout_plan"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "plan_day_plan_id_idx" ON "plan_day"("plan_id");

-- CreateIndex
CREATE INDEX "plan_exercise_plan_day_id_idx" ON "plan_exercise"("plan_day_id");

-- CreateIndex
CREATE INDEX "plan_exercise_exercise_id_idx" ON "plan_exercise"("exercise_id");

-- CreateIndex
CREATE INDEX "workout_user_id_started_at_idx" ON "workout"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "workout_user_id_status_idx" ON "workout"("user_id", "status");

-- CreateIndex
CREATE INDEX "workout_user_id_scheduled_for_idx" ON "workout"("user_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "workout_plan_id_idx" ON "workout"("plan_id");

-- CreateIndex
CREATE INDEX "workout_plan_day_id_idx" ON "workout"("plan_day_id");

-- CreateIndex
CREATE INDEX "workout_exercise_workout_id_idx" ON "workout_exercise"("workout_id");

-- CreateIndex
CREATE INDEX "workout_exercise_exercise_id_idx" ON "workout_exercise"("exercise_id");

-- CreateIndex
CREATE INDEX "workout_set_workout_exercise_id_idx" ON "workout_set"("workout_exercise_id");

-- CreateIndex
CREATE INDEX "personal_record_user_id_exercise_id_type_idx" ON "personal_record"("user_id", "exercise_id", "type");

-- CreateIndex
CREATE INDEX "personal_record_exercise_id_idx" ON "personal_record"("exercise_id");

-- CreateIndex
CREATE INDEX "weight_entry_user_id_date_idx" ON "weight_entry"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "weight_entry_user_id_date_key" ON "weight_entry"("user_id", "date");

-- CreateIndex
CREATE INDEX "ai_conversation_user_id_kind_idx" ON "ai_conversation"("user_id", "kind");

-- CreateIndex
CREATE INDEX "ai_message_conversation_id_idx" ON "ai_message"("conversation_id");

-- CreateIndex
CREATE INDEX "ai_generation_user_id_kind_idx" ON "ai_generation"("user_id", "kind");

-- CreateIndex
CREATE INDEX "ai_generation_user_id_input_hash_idx" ON "ai_generation"("user_id", "input_hash");

-- CreateIndex
CREATE INDEX "ai_action_draft_user_id_status_idx" ON "ai_action_draft"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_usage_daily_user_id_day_idx" ON "ai_usage_daily"("user_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_daily_user_id_day_task_model_key" ON "ai_usage_daily"("user_id", "day", "task", "model");

-- CreateIndex
CREATE INDEX "weekly_checkin_user_id_week_start_idx" ON "weekly_checkin"("user_id", "week_start");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_checkin_user_id_week_start_key" ON "weekly_checkin"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "user_achievement_user_id_idx" ON "user_achievement"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievement_user_id_achievement_key_key" ON "user_achievement"("user_id", "achievement_key");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_user_id_kind_key" ON "notification_preference"("user_id", "kind");

-- CreateIndex
CREATE INDEX "notification_user_id_scheduled_for_idx" ON "notification"("user_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_target" ADD CONSTRAINT "nutrition_target_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entitlement" ADD CONSTRAINT "entitlement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food" ADD CONSTRAINT "food_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_entry" ADD CONSTRAINT "food_entry_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal" ADD CONSTRAINT "meal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_item" ADD CONSTRAINT "meal_item_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_day" ADD CONSTRAINT "plan_day_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "workout_plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_exercise" ADD CONSTRAINT "plan_exercise_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "plan_day"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_exercise" ADD CONSTRAINT "plan_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "workout_plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout" ADD CONSTRAINT "workout_plan_day_id_fkey" FOREIGN KEY ("plan_day_id") REFERENCES "plan_day"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_set" ADD CONSTRAINT "workout_set_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_record" ADD CONSTRAINT "personal_record_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weight_entry" ADD CONSTRAINT "weight_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversation" ADD CONSTRAINT "ai_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_message" ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_generation" ADD CONSTRAINT "ai_generation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_draft" ADD CONSTRAINT "ai_action_draft_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage_daily" ADD CONSTRAINT "ai_usage_daily_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_checkin" ADD CONSTRAINT "weekly_checkin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_achievement_key_fkey" FOREIGN KEY ("achievement_key") REFERENCES "achievement"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
