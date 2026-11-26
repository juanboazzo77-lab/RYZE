import {
  activityLogSchema, dayOnlySchema, ACTIVITY_DELETE_OP, ACTIVITY_LOG_OP, WEIGHT_DELETE_OP,
} from '@/lib/sync/progress';
import { RejectedOperation, type Handler } from './apply';
import { checkDay } from './check-day';
import type { MobileTx } from './handlers';

/** True si el registro se cambió después de lo que se está subiendo: gana el cambio hecho más tarde. */
const changedLater = (row: { editedAt: Date | null; updatedAt: Date }, at: Date) =>
  (row.editedAt ?? row.updatedAt).getTime() > at.getTime();

export function buildProgressHandlers({ userId, timezone }: { userId: string; timezone: string }): Record<string, Handler<MobileTx>> {
  return {
    /** Borrar el peso de un día. */
    [WEIGHT_DELETE_OP]: async (tx, { payload, at }) => {
      const p = dayOnlySchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);
      const current = await tx.weightEntry.findFirst({ where: { date }, select: { id: true, editedAt: true, updatedAt: true } });
      if (current && !changedLater(current, at)) await tx.weightEntry.deleteMany({ where: { id: current.id } });
    },

    /** Los pasos de un día (hay un registro por fecha). */
    [ACTIVITY_LOG_OP]: async (tx, { payload, at }) => {
      const p = activityLogSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);
      const values = { steps: p.data.steps, activeMinutes: p.data.activeMinutes ?? null, editedAt: at };
      const current = await tx.dailyActivity.findFirst({ where: { date }, select: { id: true, editedAt: true, updatedAt: true } });
      if (!current) {
        await tx.dailyActivity.create({ data: { userId, date, ...values } });
        return;
      }
      if (!changedLater(current, at)) await tx.dailyActivity.updateMany({ where: { id: current.id }, data: values });
    },

    [ACTIVITY_DELETE_OP]: async (tx, { payload, at }) => {
      const p = dayOnlySchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);
      const current = await tx.dailyActivity.findFirst({ where: { date }, select: { id: true, editedAt: true, updatedAt: true } });
      if (current && !changedLater(current, at)) await tx.dailyActivity.deleteMany({ where: { id: current.id } });
    },
  };
}
