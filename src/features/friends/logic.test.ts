import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, generateCode, normalizeCode, rankFriends, type FriendStats } from './logic';

describe('generateCode', () => {
  it('genera códigos del largo esperado y sin caracteres ambiguos', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toHaveLength(CODE_LENGTH);
      expect(c).toMatch(/^[A-HJKMNP-Z2-9]+$/);
    }
  });
  it('usa el generador de números que se le pase', () => {
    expect(generateCode(() => 0)).toBe('AAAAAA');
  });
});

describe('normalizeCode', () => {
  it('pasa a mayúsculas y saca espacios y guiones', () => {
    expect(normalizeCode(' ab3-k9z ')).toBe('AB3K9Z');
  });
  it('rechaza lo que no parece un código', () => {
    expect(normalizeCode('')).toBe('');
    expect(normalizeCode('ab')).toBe('');
    expect(normalizeCode('hola que tal!')).toBe('');
    expect(normalizeCode('x'.repeat(20))).toBe('');
  });
});

describe('rankFriends', () => {
  const f = (name: string, weekWorkouts: number, streak: number): FriendStats => ({
    id: name,
    name,
    isMe: false,
    weekWorkouts,
    streak,
  });
  it('ordena por entrenos, después racha, después nombre', () => {
    const out = rankFriends([f('Zoe', 3, 1), f('Ana', 3, 1), f('Beto', 4, 0), f('Caro', 3, 5)]);
    expect(out.map((r) => r.name)).toEqual(['Beto', 'Caro', 'Ana', 'Zoe']);
  });
  it('no modifica la lista original', () => {
    const rows = [f('B', 1, 0), f('A', 2, 0)];
    rankFriends(rows);
    expect(rows[0]!.name).toBe('B');
  });
});
