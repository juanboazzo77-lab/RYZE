import { describe, expect, it } from 'vitest';
import {
  asTrainerStatus,
  attentionLevel,
  daysBetweenISO,
  generateInviteCode,
  INVITE_CODE_LENGTH,
  latestISO,
  normalizeInviteCode,
  weightChangeKg,
} from './logic';

describe('código de invitación', () => {
  it('se genera con el largo y las letras permitidas', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(normalizeInviteCode(code)).toBe(code);
  });

  it('se normaliza: mayúsculas, sin espacios ni guiones', () => {
    expect(normalizeInviteCode('abcd-2345')).toBe('ABCD2345');
    expect(normalizeInviteCode(' abcd 2345 ')).toBe('ABCD2345');
  });

  it('rechaza lo que no tiene forma de código', () => {
    expect(normalizeInviteCode('ABC')).toBe('');
    expect(normalizeInviteCode('ABCD23456')).toBe('');
    // 0, O, 1, I y L no existen en el alfabeto.
    expect(normalizeInviteCode('ABCD2301')).toBe('');
    expect(normalizeInviteCode('ABCD23!5')).toBe('');
  });
});

describe('estado del entrenador', () => {
  it('un valor desconocido queda pendiente', () => {
    expect(asTrainerStatus('ACTIVE')).toBe('ACTIVE');
    expect(asTrainerStatus('lo que sea')).toBe('PENDING');
  });
});

describe('semáforo de atención', () => {
  const today = '2026-11-10';
  it('sin actividad es "nuevo"', () => {
    expect(attentionLevel(null, today)).toBe('NEW');
  });
  it('hasta 3 días está al día', () => {
    expect(attentionLevel('2026-11-10', today)).toBe('OK');
    expect(attentionLevel('2026-11-07', today)).toBe('OK');
  });
  it('de 4 a 7 días está atrasado', () => {
    expect(attentionLevel('2026-11-06', today)).toBe('LATE');
    expect(attentionLevel('2026-11-03', today)).toBe('LATE');
  });
  it('más de 7 días está sin actividad', () => {
    expect(attentionLevel('2026-11-02', today)).toBe('INACTIVE');
  });
});

describe('fechas y peso', () => {
  it('cuenta días entre fechas', () => {
    expect(daysBetweenISO('2026-11-01', '2026-11-10')).toBe(9);
    expect(daysBetweenISO('2026-11-10', '2026-11-01')).toBe(0);
  });
  it('elige la fecha más reciente ignorando las que faltan', () => {
    expect(latestISO([null, '2026-11-02', undefined, '2026-11-05'])).toBe('2026-11-05');
    expect(latestISO([null, undefined])).toBeNull();
  });
  it('cambio de peso entre el primer y el último registro', () => {
    expect(weightChangeKg([{ date: '2026-11-09', weightKg: 79.2 }, { date: '2026-10-20', weightKg: 80 }])).toBe(-0.8);
    expect(weightChangeKg([{ date: '2026-11-09', weightKg: 79 }])).toBeNull();
  });
});
