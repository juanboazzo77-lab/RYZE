import { describe, expect, it } from 'vitest';
import { reducers, readAppData } from '@/lib/sync/data';
import { RejectedOperation } from './apply';
import { buildHandlers, type MobileTx } from './handlers';

function fake(prefsEditedAt: Date | null = null) {
  const profile: Record<string, unknown> = { id: 'ana', locale: 'ES', unitSystem: 'METRIC', prefsEditedAt };
  const asked: string[] = [];
  const tx = {
    profile: {
      async findUnique({ where }: { where: { id: string } }) {
        asked.push(where.id);
        return profile;
      },
      async update({ where, data }: { where: { id: string }; data: object }) {
        asked.push(where.id);
        Object.assign(profile, data);
      },
    },
  } as unknown as MobileTx;
  const run = (payload: unknown, at = '2026-11-26T12:00:00Z') =>
    buildHandlers({ userId: 'ana', timezone: 'UTC' })['prefs.update']!(tx, { payload, at: new Date(at) });
  return { run, profile, asked };
}

describe('ajustes desde la app', () => {
  it('cambia sólo lo pedido, siempre en la cuenta de la sesión', async () => {
    const f = fake();
    await f.run({ locale: 'EN', id: 'otra-cuenta', email: 'x@example.com' });
    expect(f.profile).toMatchObject({ id: 'ana', locale: 'EN', unitSystem: 'METRIC', prefsEditedAt: new Date('2026-11-26T12:00:00Z') });
    expect(f.profile).not.toHaveProperty('email');
    expect(new Set(f.asked)).toEqual(new Set(['ana']));
  });

  it('un cambio viejo del teléfono no pisa uno hecho después en la web', async () => {
    const f = fake(new Date('2026-11-26T18:00:00Z'));
    await f.run({ unitSystem: 'IMPERIAL' });
    expect(f.profile.unitSystem).toBe('METRIC');
    await f.run({ unitSystem: 'IMPERIAL' }, '2026-11-26T19:00:00Z');
    expect(f.profile.unitSystem).toBe('IMPERIAL');
  });

  it('rechaza valores que no existen y pedidos vacíos', async () => {
    const f = fake();
    for (const payload of [null, {}, { locale: 'XX' }, { unitSystem: 'PIEDRAS' }, { role: 'admin' }]) {
      await expect(f.run(payload)).rejects.toThrow(RejectedOperation);
    }
    expect(f.profile).toMatchObject({ locale: 'ES', unitSystem: 'METRIC' });
  });

  it('en el teléfono se ve al momento', () => {
    const data = { profile: { name: null, email: 'a@example.com', timezone: 'UTC', unitSystem: 'METRIC', weekStart: 1, locale: 'ES' }, weights: [] };
    const out = reducers['prefs.update']!(data, { id: 'x', type: 'prefs.update', payload: { locale: 'PT', unitSystem: 'IMPERIAL' }, createdAt: '2026-11-26T12:00:00Z' });
    expect(readAppData(out)!.profile).toMatchObject({ locale: 'PT', unitSystem: 'IMPERIAL', email: 'a@example.com' });
  });
});
