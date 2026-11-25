import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { addDaysISO, isoToUtcDate, localTodayISO } from '@/lib/date';
import { DateTime } from 'luxon';
import { RejectedOperation, type Handler } from './apply';

/**
 * Un manejador por cada cosa que la app puede subir. Reciben la base YA acotada a la persona (`forUser`), así que
 * nada de lo que mande el teléfono puede tocar datos de otra cuenta. Todo lo que llega se valida como si viniera de
 * cualquiera.
 */

export type MobileTx = Pick<PrismaClient, 'weightEntry' | 'syncOp'>;

const weightSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().min(20).max(500),
  note: z.string().trim().max(200).optional(),
});

/** Fecha que existe de verdad (no "31 de febrero") y no posterior a mañana según cuándo se anotó. */
function checkDay(date: string, at: Date, timezone: string) {
  const parsed = isoToUtcDate(date);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new RejectedOperation('INVALID');
  }
  const limit = addDaysISO(localTodayISO(timezone, DateTime.fromJSDate(at)), 1);
  if (date > limit) throw new RejectedOperation('FUTURE_DATE');
  return parsed;
}

export function buildHandlers({ userId, timezone }: { userId: string; timezone: string }): Record<string, Handler<MobileTx>> {
  return {
    /** El peso de un día (hay uno por fecha). */
    'weight.log': async (tx, { payload, at }) => {
      const p = weightSchema.safeParse(payload);
      if (!p.success) throw new RejectedOperation('INVALID');
      const date = checkDay(p.data.date, at, timezone);
      const values = { weightKg: p.data.weightKg, note: p.data.note || null, editedAt: at };

      const current = await tx.weightEntry.findFirst({ where: { date }, select: { id: true, editedAt: true, updatedAt: true } });
      if (!current) {
        await tx.weightEntry.create({ data: { userId, date, ...values } });
        return;
      }
      // Gana el cambio hecho más tarde: si después de esto se corrigió (por ejemplo en la web), no se pisa.
      if ((current.editedAt ?? current.updatedAt).getTime() > at.getTime()) return;
      await tx.weightEntry.updateMany({ where: { id: current.id }, data: values });
    },
  };
}
