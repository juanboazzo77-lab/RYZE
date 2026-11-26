import { describe, expect, it } from 'vitest';
import { activityView } from '@/lib/activity/view';
import { weightSummary } from '@/lib/progress/summary';
import { readAppData, reducers } from './data';

const op = (type: string, payload: unknown) => ({ id: '00000000-0000-4000-8000-000000000001', type, payload, createdAt: '2026-11-25T15:00:00.000Z' });
const base = {
  profile: { name: null, email: 'a@example.com', timezone: 'America/Argentina/Buenos_Aires', unitSystem: 'METRIC', weekStart: 1, locale: 'ES' },
  weights: [{ date: '2026-11-25', weightKg: 79, note: null }, { date: '2026-11-18', weightKg: 80, note: null }],
  activity: [{ date: '2026-11-24', steps: 8000, activeMinutes: null }],
};
const apply = (data: Record<string, unknown>, type: string, payload: unknown) => reducers[type]!(data, op(type, payload));

describe('progreso sin señal', () => {
  it('borrar un peso lo saca de la pantalla aunque no se haya subido', () => {
    const out = apply(base, 'weight.delete', { date: '2026-11-25' });
    expect(readAppData(out)!.weights.map((w) => w.date)).toEqual(['2026-11-18']);
    expect(apply(out, 'weight.delete', { date: '2026-11-25' })).toEqual(out);
    expect(apply(base, 'weight.delete', { roto: 1 })).toBe(base);
  });

  it('los pasos se anotan en orden, se reemplazan por fecha y se borran', () => {
    let data: Record<string, unknown> = apply(base, 'activity.log', { date: '2026-11-25', steps: 3000 });
    data = apply(data, 'activity.log', { date: '2026-11-20', steps: 100, activeMinutes: 10 });
    data = apply(data, 'activity.log', { date: '2026-11-25', steps: 5000 });
    expect(readAppData(data)!.activity).toEqual([
      { date: '2026-11-20', steps: 100, activeMinutes: 10 },
      { date: '2026-11-24', steps: 8000, activeMinutes: null },
      { date: '2026-11-25', steps: 5000, activeMinutes: null },
    ]);
    expect(readAppData(apply(data, 'activity.delete', { date: '2026-11-24' }))!.activity).toHaveLength(2);
  });

  it('con datos guardados por una versión anterior, sin pasos, no rompe', () => {
    const { activity: _a, ...older } = base;
    expect(apply(older, 'activity.log', { date: '2026-11-25', steps: 1 })).toBe(older);
  });

  it('la tarjeta de pasos cuenta sólo los últimos 30 días', () => {
    const view = activityView(
      [{ date: '2026-10-01', steps: 99999, activeMinutes: null }, { date: '2026-11-24', steps: 8000, activeMinutes: null }, { date: '2026-11-25', steps: 4000, activeMinutes: null }],
      '2026-11-25',
    );
    expect(view).toMatchObject({ todaySteps: 4000, avg7: 6000, avg30: 6000 });
    expect(view.recent.map((r) => r.date)).toEqual(['2026-11-25', '2026-11-24']);
  });

  it('los números de peso usan el objetivo y acotan el gráfico al período', () => {
    const points = [{ date: '2026-09-01', weightKg: 85 }, { date: '2026-11-18', weightKg: 80 }, { date: '2026-11-25', weightKg: 79 }];
    const s = weightSummary(points, { startWeightKg: null, targetWeightKg: 75 }, '2026-11-25', 30);
    expect(s).toMatchObject({ currentKg: 79, startKg: 85, targetKg: 75, totalChangeKg: -6 });
    expect(s.chart.map((c) => c.date)).toEqual(['2026-11-18', '2026-11-25']);
    expect(weightSummary(points, { startWeightKg: 90, targetWeightKg: null }, '2026-11-25', 100000)).toMatchObject({ startKg: 90, totalChangeKg: -11 });
    expect(weightSummary([], null, '2026-11-25', 30)).toMatchObject({ currentKg: null, totalChangeKg: null, chart: [] });
  });
});
