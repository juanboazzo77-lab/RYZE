import type { SyncLog } from './apply';
import type { MobileTx } from './handlers';

/**
 * El registro de operaciones sobre la base. `db` tiene que venir acotada a la persona; `transaction` ejecuta todo
 * junto o nada. Se reciben de afuera para poder probarlo contra una base real sin dejar nada guardado.
 */
export function prismaSyncLog({
  userId,
  db,
  transaction,
}: {
  userId: string;
  db: MobileTx;
  transaction: (run: (tx: MobileTx) => Promise<void>) => Promise<void>;
}): SyncLog<MobileTx> {
  return {
    async find(opId) {
      const row = await db.syncOp.findFirst({ where: { opId }, select: { status: true, reason: true } });
      return row ? { status: row.status === 'rejected' ? 'rejected' : 'applied', reason: row.reason } : null;
    },
    applyOnce(op, at, change) {
      return transaction(async (tx) => {
        // Primero se anota: si otro envío del mismo cambio ya lo anotó, falla acá y no se aplica dos veces.
        await tx.syncOp.create({ data: { userId, opId: op.id, type: op.type, status: 'applied', createdAt: at } });
        await change(tx);
      });
    },
    async recordRejected(op, at, reason) {
      await db.syncOp.createMany({
        data: [{ userId, opId: op.id, type: op.type, status: 'rejected', reason, createdAt: at }],
        skipDuplicates: true,
      });
    },
  };
}
