import 'server-only';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // DATABASE_URL usa el pooler (pgbouncer, transaction mode) con
    // connection_limit=5 y latencia de red: las escrituras anidadas (p. ej.
    // crear un plan con sus días y ejercicios) pasan el timeout de transacción
    // por defecto de Prisma (5s → P2028). El código sigue agrupando queries en
    // $transaction/secuencial donde tenía sentido — con un pool chico (sea 1 o
    // 5) menos conexiones simultáneas siguen siendo más rápidas y confiables.
    transactionOptions: { timeout: 20_000, maxWait: 15_000 },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
