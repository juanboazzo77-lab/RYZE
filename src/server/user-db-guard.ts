/**
 * Lógica pura del scoping por usuario (sin Prisma ni `server-only`), para poder
 * testearla en aislamiento. La usa `user-db.ts` dentro de la extensión Prisma.
 */

export const USER_MODELS = new Set<string>([
  'Goal',
  'NutritionTarget',
  'FoodEntry',
  'Meal',
  'WorkoutPlan',
  'Workout',
  'PersonalRecord',
  'WeightEntry',
  'DailyActivity',
  'AiConversation',
  'AiGeneration',
  'AiActionDraft',
  'AiUsageDaily',
  'WeeklyCheckin',
  'UserAchievement',
  'NotificationPreference',
  'Notification',
  'PushSubscription',
]);

export const WHERE_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

export const BLOCKED_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
  'upsert',
]);

/** Lanza si `operation` no está permitida sobre un modelo del usuario. */
export function assertOperationAllowed(model: string, operation: string): void {
  if (!USER_MODELS.has(model)) return;
  if (BLOCKED_OPS.has(operation)) {
    throw new Error(
      `[user-db] "${operation}" no está permitido sobre ${model}. ` +
        `Usá findFirst / updateMany / deleteMany con { id } (el userId lo pone user-db).`,
    );
  }
}

/** Inyecta `where.userId` en las operaciones que filtran. */
export function scopeArgs<T extends Record<string, unknown> | undefined>(
  model: string,
  operation: string,
  args: T,
  userId: string,
): T {
  if (!USER_MODELS.has(model) || !WHERE_OPS.has(operation)) return args;
  const next = { ...(args ?? {}) } as Record<string, unknown>;
  next.where = { ...((next.where as Record<string, unknown>) ?? {}), userId };
  return next as T;
}
