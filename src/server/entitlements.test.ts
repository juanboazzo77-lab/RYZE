import { describe, expect, it } from 'vitest';
import { can, hasFullAccess, limitsFor, showAds, isInTrial, trialDaysLeft, withFullAccess, withGymAccess, GYM_LIMITS } from './entitlements';

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('socio de un gimnasio', () => {
  const free = { tier: 'FREE' as const, createdAt: daysAgo(30) };

  it('una cuenta gratis pasa a los límites del gimnasio, sin anuncios', () => {
    const g = withGymAccess(free);
    expect(g.gymAccess).toBe(true);
    expect(showAds(g)).toBe(false);
    expect(limitsFor(g)).toBe(GYM_LIMITS);
    expect(limitsFor(g).aiCoachMessagesPerDay).toBe(5);
    expect(limitsFor(g).aiPlansPerMonth).toBe(1);
    expect(limitsFor(g).mealPlansPerMonth).toBe(1);
  });

  it('puede pedir su rutina y su dieta, pero no la revisión semanal ni el análisis de físico', () => {
    const g = withGymAccess(free);
    expect(can(g, 'ai_generate_plan')).toBe(true);
    expect(can(g, 'ai_meal_plan')).toBe(true);
    expect(can(g, 'ai_coach_message')).toBe(true);
    expect(can(g, 'weekly_checkin')).toBe(false);
    expect(can(g, 'physique_analysis')).toBe(false);
  });

  it('el acceso del gimnasio gana también durante la prueba gratis', () => {
    const g = withGymAccess({ tier: 'FREE' as const, createdAt: daysAgo(1) });
    expect(limitsFor(g).aiCoachMessagesPerDay).toBe(5);
  });

  it('quien ya paga un plan propio se queda con lo que contrató', () => {
    const pro = { tier: 'PRO' as const, createdAt: daysAgo(30) };
    expect(withGymAccess(pro)).toBe(pro);
    expect(limitsFor(withGymAccess(pro)).aiCoachMessagesPerDay).toBe(30);
  });
});

describe('plan GYM de las tiendas', () => {
  const gym = { tier: 'GYM' as const, createdAt: daysAgo(30) };

  it('da lo mismo que un socio de gimnasio y sin anuncios', () => {
    expect(limitsFor(gym)).toBe(GYM_LIMITS);
    expect(showAds(gym)).toBe(false);
    expect(can(gym, 'ai_meal_plan')).toBe(true);
    expect(can(gym, 'weekly_checkin')).toBe(false);
  });

  it('si además es socio de un gimnasio, se queda como está', () => {
    expect(withGymAccess(gym)).toBe(gym);
  });
});

describe('entitlements', () => {
  it('FREE dentro de la prueba gratis tiene acceso completo (igual que COACH) para probar todo', () => {
    const trial = { tier: 'FREE' as const, createdAt: daysAgo(1) };
    expect(isInTrial(trial)).toBe(true);
    expect(limitsFor(trial).aiCoachMessagesPerDay).toBe(5);
    expect(limitsFor(trial).aiPlansPerMonth).toBe(1);
    expect(can(trial, 'ai_coach_message')).toBe(true);
    expect(can(trial, 'weekly_checkin')).toBe(true);
    expect(can(trial, 'advanced_stats')).toBe(true);
    expect(can(trial, 'coach_profile')).toBe(true);
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
    expect(limitsFor(pro).aiCoachMessagesPerDay).toBe(30);
    expect(limitsFor(pro).aiPlansPerMonth).toBe(4);
    expect(limitsFor(pro).checkinEveryWeeks).toBe(2);
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

  it('la cuenta de demostración tiene plan COACH aunque su prueba haya vencido', () => {
    const expired = { tier: 'FREE' as const, createdAt: daysAgo(60) };
    expect(hasFullAccess('Demo@Fitai.app')).toBe(true);
    expect(hasFullAccess('otra@persona.com')).toBe(false);
    expect(hasFullAccess('VFernandezMussi@gmail.com')).toBe(true);
    const full = withFullAccess('demo@fitai.app', expired);
    expect(can(full, 'coach_profile')).toBe(true);
    expect(can(withFullAccess('otra@persona.com', expired), 'ai_coach_message')).toBe(false);
  });

  it('los días regalados por invitar extienden la prueba aunque ya hubiera vencido', () => {
    const old = { tier: 'FREE' as const, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    expect(isInTrial(old)).toBe(false);
    const withBonus = { ...old, bonusUntil: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) };
    expect(isInTrial(withBonus)).toBe(true);
    expect(trialDaysLeft(withBonus)).toBe(5);
  });

  it('un bonus vencido no cambia nada', () => {
    const old = { tier: 'FREE' as const, createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), bonusUntil: new Date(Date.now() - 1000) };
    expect(isInTrial(old)).toBe(false);
  });
});
