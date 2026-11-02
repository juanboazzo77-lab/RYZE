import { describe, expect, it } from 'vitest';
import { computeReviewPeriod } from './period';

// 2026-11-04 es miércoles.
describe('computeReviewPeriod', () => {
  it('revisión de miércoles hecha el miércoles: desde el día después del miércoles pasado', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-04', reviewWeekday: 3 });
    expect(p).toEqual({ startISO: '2026-10-29', endISO: '2026-11-04', days: 7 });
  });

  it('con una revisión anterior, cubre justo entre una y otra', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-04', reviewWeekday: 3, previousEndISO: '2026-10-28' });
    expect(p).toEqual({ startISO: '2026-10-29', endISO: '2026-11-04', days: 7 });
  });

  it('si la hizo un día tarde, el período sigue a la revisión anterior (sin huecos ni solapes)', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-05', reviewWeekday: 3, previousEndISO: '2026-10-28' });
    expect(p.startISO).toBe('2026-10-29');
    expect(p.days).toBe(8);
  });

  it('cada dos semanas cubre las dos', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-04', reviewWeekday: 3, previousEndISO: '2026-10-21' });
    expect(p.days).toBe(14);
  });

  it('al editar la revisión de esta semana conserva el inicio', () => {
    const p = computeReviewPeriod({
      todayISO: '2026-11-06',
      reviewWeekday: 3,
      resubmitStartISO: '2026-10-29',
      previousEndISO: '2026-10-28',
    });
    expect(p.startISO).toBe('2026-10-29');
    expect(p.endISO).toBe('2026-11-06');
  });

  it('primera revisión hecha tarde no queda en un par de días: usa los últimos 7', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-06', reviewWeekday: 3 });
    expect(p).toEqual({ startISO: '2026-10-31', endISO: '2026-11-06', days: 7 });
  });

  it('nunca cubre más de cuatro semanas', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-04', reviewWeekday: 3, previousEndISO: '2026-08-01' });
    expect(p.days).toBe(28);
  });

  it('si la revisión anterior termina hoy o después, cubre sólo hoy', () => {
    const p = computeReviewPeriod({ todayISO: '2026-11-04', reviewWeekday: 3, previousEndISO: '2026-11-04' });
    expect(p).toEqual({ startISO: '2026-11-04', endISO: '2026-11-04', days: 1 });
  });
});
