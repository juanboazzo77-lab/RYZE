import { describe, expect, it } from 'vitest';
import { codeStats, GYM_TRIAL_DAYS, shareCodeText } from './code-share';

const now = new Date('2026-11-12T12:00:00.000Z');
const day = 24 * 60 * 60 * 1000;

describe('shareCodeText', () => {
  it('lleva el nombre, el código y los días gratis', () => {
    const t = shareCodeText({ gymName: 'Iron Gym', code: 'ABCD-2345', url: 'https://www.forzaai.app' });
    expect(t).toContain('Iron Gym');
    expect(t).toContain('ABCD-2345');
    expect(t).toContain(`${GYM_TRIAL_DAYS} días`);
  });
});

describe('codeStats', () => {
  it('separa los que están en prueba de los que ya la terminaron', () => {
    const s = codeStats([{ trialEndsAt: new Date(now.getTime() + day) }, { trialEndsAt: new Date(now.getTime() - day) }, { trialEndsAt: null }], now);
    expect(s).toEqual({ total: 3, inTrial: 1, ended: 2 });
  });
  it('sin nadie, todo en cero', () => {
    expect(codeStats([], now)).toEqual({ total: 0, inTrial: 0, ended: 0 });
  });
});
