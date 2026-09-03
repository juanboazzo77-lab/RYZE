import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { assertOperationAllowed, scopeArgs, USER_MODELS } from './user-db-guard';

/**
 * Punto único de acceso a datos del usuario.
 *
 * `forUser(userId)` devuelve un cliente Prisma que inyecta `user_id` en toda
 * operación sobre modelos propios del usuario:
 *   - lecturas / count / aggregate / groupBy / updateMany / deleteMany
 *     → `where.userId`
 *   - create / createMany → lo exige TypeScript (columna NOT NULL); se pasa
 *     explícito (`userId: ctx.userId`)
 *   - findUnique / update / delete / upsert → BLOQUEADAS sobre modelos del
 *     usuario: usar findFirst / updateMany / deleteMany con `{ id }`.
 *
 * Así es imposible leer/escribir datos de otro usuario por descuido. La segunda
 * barrera es RLS de Postgres (ver prisma/MIGRATIONS.md).
 *
 * `Profile` y `Entitlement` quedan fuera: se acceden siempre con el id de la
 * sesión desde `src/server/context.ts`. Los modelos hijos (MealItem, PlanDay,
 * PlanExercise, WorkoutExercise, WorkoutSet, AiMessage) no tienen `user_id`; se
 * consultan siempre a través de su padre, que sí está scopeado.
 */

export type UserDb = ReturnType<typeof buildUserClient>;

function buildUserClient(userId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ model, operation, args, query }: any) {
          if (!model || !USER_MODELS.has(model)) return query(args);
          assertOperationAllowed(model, operation);
          return query(scopeArgs(model, operation, args, userId));
        },
      },
    },
  });
}

/** Cliente Prisma acotado a un usuario. Crear uno por request. */
export function forUser(userId: string) {
  if (!userId) throw new Error('[user-db] forUser requiere un userId');
  return buildUserClient(userId);
}

export { Prisma };
