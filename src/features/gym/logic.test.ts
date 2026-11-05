import { describe, expect, it } from 'vitest';
import {
  asGymStatus,
  canJoin,
  formatGymCode,
  generateGymCode,
  GYM_CODE_LENGTH,
  normalizeGymCode,
  usedPercent,
} from './logic';

describe('código de gimnasio', () => {
  it('genera 8 caracteres sin letras que se confunden', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateGymCode();
      expect(c).toHaveLength(GYM_CODE_LENGTH);
      expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]+$/);
    }
  });

  it('normaliza mayúsculas, espacios y guiones', () => {
    expect(normalizeGymCode('abcd-2345')).toBe('ABCD2345');
    expect(normalizeGymCode(' abcd 2345 ')).toBe('ABCD2345');
  });

  it('rechaza lo que no es un código', () => {
    expect(normalizeGymCode('')).toBe('');
    expect(normalizeGymCode('ABC')).toBe('');
    expect(normalizeGymCode('ABCD0123')).toBe(''); // 0 y 1 no existen
    expect(normalizeGymCode('ABCD-2345-X')).toBe('');
  });

  it('lo muestra en dos mitades', () => {
    expect(formatGymCode('ABCD2345')).toBe('ABCD-2345');
    expect(formatGymCode('ABC')).toBe('ABC');
  });
});

describe('estado', () => {
  it('un estado raro cuenta como pendiente', () => {
    expect(asGymStatus('ACTIVE')).toBe('ACTIVE');
    expect(asGymStatus('cualquiera')).toBe('PENDING');
  });
});

describe('cupo', () => {
  it('entra con el gimnasio activo y lugar libre', () => {
    expect(canJoin({ status: 'ACTIVE', memberLimit: 150, activeMembers: 149 })).toBeNull();
  });

  it('no entra si el cupo está lleno', () => {
    expect(canJoin({ status: 'ACTIVE', memberLimit: 150, activeMembers: 150 })).toBe('FULL');
    expect(canJoin({ status: 'ACTIVE', memberLimit: 150, activeMembers: 200 })).toBe('FULL');
  });

  it('sin cupo fijado no entra nadie', () => {
    expect(canJoin({ status: 'ACTIVE', memberLimit: 0, activeMembers: 0 })).toBe('FULL');
  });

  it('un gimnasio que no está activo tiene un código inválido', () => {
    for (const status of ['PENDING', 'SUSPENDED', 'REJECTED']) {
      expect(canJoin({ status, memberLimit: 100, activeMembers: 0 })).toBe('INVALID_CODE');
    }
  });

  it('calcula el porcentaje usado sin pasarse de 100', () => {
    expect(usedPercent(75, 150)).toBe(50);
    expect(usedPercent(200, 150)).toBe(100);
    expect(usedPercent(10, 0)).toBe(0);
  });
});
