import { describe, expect, it } from 'vitest';
import { can, limitsFor } from './entitlements';

describe('entitlements', () => {
  it('FREE limita mensajes de coach y no habilita features PRO', () => {
    expect(limitsFor({ tier: 'FREE' }).aiCoachMessagesPerDay).toBe(5);
    expect(can({ tier: 'FREE' }, 'weekly_checkin')).toBe(false);
    expect(can({ tier: 'FREE' }, 'advanced_stats')).toBe(false);
    expect(can({ tier: 'FREE' }, 'ai_coach_message')).toBe(true);
  });

  it('PRO habilita todas las features y sube los límites', () => {
    expect(limitsFor({ tier: 'PRO' }).aiCoachMessagesPerDay).toBeGreaterThan(5);
    expect(can({ tier: 'PRO' }, 'weekly_checkin')).toBe(true);
    expect(can({ tier: 'PRO' }, 'progression_analysis')).toBe(true);
  });
});
