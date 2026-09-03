import { describe, expect, it } from 'vitest';
import { assertOperationAllowed, scopeArgs } from './user-db-guard';

describe('user-db guard', () => {
  it('bloquea operaciones puntuales sobre modelos del usuario', () => {
    for (const op of ['findUnique', 'update', 'delete', 'upsert', 'findUniqueOrThrow']) {
      expect(() => assertOperationAllowed('Workout', op)).toThrow(/no está permitido/);
    }
  });

  it('permite operaciones puntuales sobre modelos que no son del usuario', () => {
    expect(() => assertOperationAllowed('Food', 'findUnique')).not.toThrow();
    expect(() => assertOperationAllowed('Exercise', 'update')).not.toThrow();
  });

  it('permite findFirst / updateMany / deleteMany sobre modelos del usuario', () => {
    for (const op of ['findFirst', 'updateMany', 'deleteMany', 'findMany', 'count']) {
      expect(() => assertOperationAllowed('WeightEntry', op)).not.toThrow();
    }
  });

  it('inyecta where.userId en operaciones que filtran', () => {
    const scoped = scopeArgs('FoodEntry', 'findMany', { where: { date: '2026-09-02' } }, 'user-1');
    expect(scoped).toEqual({ where: { date: '2026-09-02', userId: 'user-1' } });
  });

  it('inyecta where.userId aunque no venga where', () => {
    expect(scopeArgs('Meal', 'count', undefined, 'user-1')).toEqual({ where: { userId: 'user-1' } });
  });

  it('no toca args de create (el userId lo pone TypeScript)', () => {
    const args = { data: { name: 'x', userId: 'user-1' } };
    expect(scopeArgs('Meal', 'create', args, 'user-2')).toBe(args);
  });

  it('no toca modelos ajenos al usuario', () => {
    const args = { where: { id: 'f1' } };
    expect(scopeArgs('Food', 'findMany', args, 'user-1')).toBe(args);
  });

  it('un userId no puede pisar el where.userId del scope', () => {
    // Aunque el caller intente colar otro userId, el del scope va último y gana.
    const scoped = scopeArgs('Workout', 'findMany', { where: { userId: 'otro' } }, 'yo');
    expect((scoped.where as { userId: string }).userId).toBe('yo');
  });
});
