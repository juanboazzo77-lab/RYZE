import { describe, expect, it } from 'vitest';
import { can, limitsFor, showAds, isInTrial, trialDaysLeft } from './entitlements';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('entitlements', () => {
  it('FREE dentro de la prueba gratis tiene mensajes/plan limitados y sin features PRO', () => {
    const trial = { tier: 'FREE' as const, createdAt: daysAgo(1) };
    expect(isInTrial(trial)).toBe(true);
    expect(limitsFor(trial).aiCoachMessagesPerDay).toBe(5);
    expect(limitsFor(trial).aiPlansPerMonth).toBe(1);
    expect(can(trial, 'ai_coach_message')).toBe(true);
    expect(can(trial, 'weekly_checkin')).toBe(false);
    expect(can(trial, 'advanced_stats')).toBe(false);
    expect(trialDaysLeft(trial)).toBeGreaterThan(0);
  });

  it('FREE con la prueba gratis vencida queda bloqueada para IA', () => {
    const expired = { tier: 'FREE' as const, createdAt: daysAgo(30) };
    expect(isInTrial(expired)).toBe(false);
    expect(limitsFor(expired).aiCoachMessagesPerDay).toBe(0);
    expect(limitsFor(expired).aiPlansPerMonth).toBe(0);
    expect(can(expired, 'ai_coach_message')).toBe(false);
    expect(can(expired, 'ai_generate_plan')).toBe(false);
    expect(trialDaysLeft(expired)).toBe(0);
  });

  it('BASIC habilita mensajes/plan de entrada, sin features PRO', () => {
    const basic = { tier: 'BASIC' as const, createdAt: daysAgo(30) };
    expect(limitsFor(basic).aiCoachMessagesPerDay).toBe(10);
    expect(limitsFor(basic).aiPlansPerMonth).toBe(1);
    expect(can(basic, 'ai_coach_message')).toBe(true);
    expect(can(basic, 'weekly_checkin')).toBe(false);
    expect(showAds({ tier: 'BASIC' })).toBe(false);
  });

  it('PRO habilita las features PRO pero no estadísticas avanzadas ni el perfil de coaching', () => {
    const pro = { tier: 'PRO' as const, createdAt: daysAgo(30) };
    expect(limitsFor(pro).aiCoachMessagesPerDay).toBe(50);
    expect(limitsFor(pro).aiPlansPerMonth).toBe(5);
    expect(can(pro, 'weekly_checkin')).toBe(true);
    expect(can(pro, 'progression_analysis')).toBe(true);
    expect(can(pro, 'advanced_stats')).toBe(false);
    expect(can(pro, 'coach_profile')).toBe(false);
  });

  it('COACH es el plan más top: todo lo de PRO + estadísticas avanzadas + el perfil de coaching', () => {
    const coach = { tier: 'COACH' as const, createdAt: daysAgo(30) };
    const pro = { tier: 'PRO' as const, createdAt: daysAgo(30) };
    expect(can(coach, 'coach_profile')).toBe(true);
    expect(can(coach, 'weekly_checkin')).toBe(true);
    expect(can(coach, 'advanced_stats')).toBe(true);
    expect(limitsFor(coach).aiCoachMessagesPerDay).toBeGreaterThan(limitsFor(pro).aiCoachMessagesPerDay);
  });

  it('sólo FREE ve publicidad', () => {
    expect(showAds({ tier: 'FREE' })).toBe(true);
    expect(showAds({ tier: 'BASIC' })).toBe(false);
    expect(showAds({ tier: 'PRO' })).toBe(false);
    expect(showAds({ tier: 'COACH' })).toBe(false);
  });
});
