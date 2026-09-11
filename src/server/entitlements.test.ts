import { describe, expect, it } from 'vitest';
import { can, limitsFor } from './entitlements';

describe('entitlements', () => {
  it('FREE limita mensajes de coach y no habilita features PRO', () => {
    expect(limitsFor({ tier: 'FREE' }).aiCoachMessagesPerDay).toBe(5);
    expect(can({ tier: 'FREE' }, 'weekly_checkin')).toBe(false);
    expect(can({ tier: 'FREE' }, 'advanced_stats')).toBe(false);
    expect(can({ tier: 'FREE' }, 'ai_coach_message')).toBe(true);
  });

  it('PRO habilita las features PRO pero no el perfil de coaching', () => {
    expect(limitsFor({ tier: 'PRO' }).aiCoachMessagesPerDay).toBeGreaterThan(5);
    expect(can({ tier: 'PRO' }, 'weekly_checkin')).toBe(true);
    expect(can({ tier: 'PRO' }, 'progression_analysis')).toBe(true);
    expect(can({ tier: 'PRO' }, 'coach_profile')).toBe(false);
  });

  it('COACH es el plan más top: todo lo de PRO + el perfil de coaching', () => {
    expect(can({ tier: 'COACH' }, 'coach_profile')).toBe(true);
    expect(can({ tier: 'COACH' }, 'weekly_checkin')).toBe(true);
    expect(can({ tier: 'COACH' }, 'advanced_stats')).toBe(true);
    expect(limitsFor({ tier: 'COACH' }).aiCoachMessagesPerDay).toBeGreaterThan(
      limitsFor({ tier: 'PRO' }).aiCoachMessagesPerDay,
    );
  });
});
