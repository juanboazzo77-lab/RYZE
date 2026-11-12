import { describe, expect, it } from 'vitest';
import { GYM_TRIAL_DAYS, memberHasGymAccess, shareCodeText, trialDaysLeft, trialEndsFrom, trialForJoin, trialState } from './trial';

const now = new Date('2026-11-12T12:00:00.000Z');
const inDays = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

describe('trialEndsFrom', () => {
  it('termina a los 3 días', () => {
    expect(trialEndsFrom(now).toISOString()).toBe('2026-11-15T12:00:00.000Z');
    expect(GYM_TRIAL_DAYS).toBe(3);
  });
});

describe('trialState', () => {
  it('solo los que entraron con el código tienen prueba', () => {
    expect(trialState({ source: 'WEB', trialEndsAt: null }, now)).toBe('NONE');
    expect(trialState({ source: 'INVITE', trialEndsAt: null }, now)).toBe('NONE');
  });
  it('está activa hasta que vence', () => {
    expect(trialState({ source: 'CODE', trialEndsAt: inDays(2) }, now)).toBe('ACTIVE');
    expect(trialState({ source: 'CODE', trialEndsAt: inDays(-1) }, now)).toBe('ENDED');
    expect(trialState({ source: 'CODE', trialEndsAt: now }, now)).toBe('ENDED');
  });
  it('sin fecha de fin, se considera terminada', () => {
    expect(trialState({ source: 'CODE', trialEndsAt: null }, now)).toBe('ENDED');
  });
});

describe('memberHasGymAccess', () => {
  it('pierde el acceso del gimnasio cuando termina la prueba', () => {
    expect(memberHasGymAccess({ source: 'CODE', trialEndsAt: inDays(1) }, now)).toBe(true);
    expect(memberHasGymAccess({ source: 'CODE', trialEndsAt: inDays(-1) }, now)).toBe(false);
  });
  it('los demás socios siempre lo tienen', () => {
    expect(memberHasGymAccess({ source: 'WEB', trialEndsAt: null }, now)).toBe(true);
    expect(memberHasGymAccess({ source: 'INVITE', trialEndsAt: null }, now)).toBe(true);
  });
});

describe('trialDaysLeft', () => {
  it('redondea hacia arriba y no baja de 0', () => {
    expect(trialDaysLeft(inDays(3), now)).toBe(3);
    expect(trialDaysLeft(new Date(now.getTime() + 60 * 60 * 1000), now)).toBe(1);
    expect(trialDaysLeft(inDays(-2), now)).toBe(0);
    expect(trialDaysLeft(null, now)).toBe(0);
  });
});

describe('trialForJoin', () => {
  it('la primera vez da 3 días', () => {
    expect(trialForJoin(null, now).toISOString()).toBe('2026-11-15T12:00:00.000Z');
    expect(trialForJoin(undefined, now).toISOString()).toBe('2026-11-15T12:00:00.000Z');
  });
  it('si ya tuvo prueba, no se renueva al volver a entrar', () => {
    const old = inDays(-10);
    expect(trialForJoin(old, now)).toBe(old);
  });
});

describe('shareCodeText', () => {
  it('lleva el nombre, el código y los días gratis', () => {
    const t = shareCodeText({ gymName: 'Iron Gym', code: 'ABCD-2345', url: 'https://www.forzaai.app' });
    expect(t).toContain('Iron Gym');
    expect(t).toContain('App Store');
    expect(t).toContain('ABCD-2345');
    expect(t).toContain('3 días');
  });
});
