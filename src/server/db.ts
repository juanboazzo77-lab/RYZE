import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // DATABASE_URL usa el pooler con connection_limit=1 y latencia de red: las
    // escrituras anidadas (p. ej. crear un plan con sus días y ejercicios)
    // pasan el timeout de transacción por defecto de Prisma (5s → P2028).
    transactionOptions: { timeout: 20_000, maxWait: 15_000 },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
