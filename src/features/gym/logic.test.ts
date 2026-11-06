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

import { approvableCount, asInviteStatus, parseEmailList, reservedSlots } from './logic';

describe('lista de mails para invitar', () => {
  it('separa por líneas, comas, punto y coma y espacios', () => {
    const r = parseEmailList('ana@x.com\nluis@x.com, marta@x.com;pedro@x.com  sol@x.com');
    expect(r.valid).toEqual(['ana@x.com', 'luis@x.com', 'marta@x.com', 'pedro@x.com', 'sol@x.com']);
    expect(r.invalid).toEqual([]);
  });

  it('pasa todo a minúsculas y saca los repetidos', () => {
    const r = parseEmailList('Ana@X.com\nana@x.com\nANA@x.COM');
    expect(r.valid).toEqual(['ana@x.com']);
  });

  it('acepta el formato "Nombre <mail>"', () => {
    expect(parseEmailList('Ana Perez <ana@x.com>').valid).toEqual(['ana@x.com']);
  });

  it('devuelve aparte lo que no es un mail', () => {
    const r = parseEmailList('ana@x.com hola sinarroba.com juan@@x.com');
    expect(r.valid).toEqual(['ana@x.com']);
    expect(r.invalid).toEqual(['hola', 'sinarroba.com', 'juan@@x.com']);
  });

  it('una lista vacía no da nada', () => {
    expect(parseEmailList('   \n  ')).toEqual({ valid: [], invalid: [] });
  });
});

describe('cupo con invitaciones', () => {
  it('las invitaciones aprobadas reservan lugar aunque la persona no haya entrado', () => {
    expect(reservedSlots({ activeMembers: 10, approvedInvites: 5 })).toBe(15);
    expect(approvableCount({ memberLimit: 20, activeMembers: 10, approvedInvites: 5 })).toBe(5);
  });

  it('no se puede aprobar más allá del cupo', () => {
    expect(approvableCount({ memberLimit: 10, activeMembers: 10, approvedInvites: 0 })).toBe(0);
    expect(approvableCount({ memberLimit: 10, activeMembers: 8, approvedInvites: 5 })).toBe(0);
  });

  it('un estado raro cuenta como pendiente', () => {
    expect(asInviteStatus('JOINED')).toBe('JOINED');
    expect(asInviteStatus('xx')).toBe('PENDING');
  });
});
