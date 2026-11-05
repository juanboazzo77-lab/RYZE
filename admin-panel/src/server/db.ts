import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // DATABASE_URL usa el pooler (pgbouncer, transaction mode) con
    // connection_limit=15 (medido contra la base real en el plan Pro de
    // Supabase: no mejora más allá de 15, ahí el cuello de botella pasa a ser
    // la latencia de red) y con latencia de red: las escrituras anidadas
    // (p. ej. crear un plan con sus días y ejercicios) pasan el timeout de
    // transacción por defecto de Prisma (5s → P2028). El código sigue
    // agrupando queries en $transaction/secuencial donde tenía sentido —
    // sigue siendo más rápido y confiable que muchas queries sueltas en
    // paralelo, más allá del tamaño del pool.
    transactionOptions: { timeout: 20_000, maxWait: 15_000 },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
