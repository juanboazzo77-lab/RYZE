import { describe, expect, it } from 'vitest';
import { cleanPlan, describePlan, planAllowsClass, weekBounds, weeklyLimitReached, type PlanRule } from './plans';

const funcional: PlanRule = { classesMode: 'SELECTED', classNames: ['Funcional', 'Spinning'], weeklyLimit: 3 };
const libre: PlanRule = { classesMode: 'ALL', classNames: [], weeklyLimit: null };

describe('planes del gimnasio: a qué clases se puede anotar', () => {
  it('sin plan o con un plan que incluye todo, entra a cualquier clase', () => {
    expect(planAllowsClass(null, 'Yoga')).toBe(true);
    expect(planAllowsClass(libre, 'Yoga')).toBe(true);
  });

  it('con un plan de clases elegidas, solo a esas (sin importar mayúsculas ni espacios)', () => {
    expect(planAllowsClass(funcional, 'funcional')).toBe(true);
    expect(planAllowsClass(funcional, '  SPINNING ')).toBe(true);
    expect(planAllowsClass(funcional, 'Yoga')).toBe(false);
  });
});

describe('planes del gimnasio: reservas por semana', () => {
  it('la semana va de lunes a domingo', () => {
    expect(weekBounds('2026-11-11')).toEqual({ start: '2026-11-09', end: '2026-11-15' }); // miércoles
    expect(weekBounds('2026-11-09')).toEqual({ start: '2026-11-09', end: '2026-11-15' }); // lunes
    expect(weekBounds('2026-11-15')).toEqual({ start: '2026-11-09', end: '2026-11-15' }); // domingo
  });

  it('corta cuando ya usó todas las del plan', () => {
    expect(weeklyLimitReached(funcional, 2)).toBe(false);
    expect(weeklyLimitReached(funcional, 3)).toBe(true);
    expect(weeklyLimitReached(libre, 50)).toBe(false);
    expect(weeklyLimitReached(null, 50)).toBe(false);
  });
});

describe('cargar un plan', () => {
  it('acepta un plan completo', () => {
    const r = cleanPlan({ name: ' 3 veces por semana ', description: 'Funcional y spinning', price: '25.000', classesMode: 'SELECTED', classNames: ['Funcional', 'funcional', 'Spinning'], weeklyLimit: '3' });
    expect(r).toEqual({ name: '3 veces por semana', description: 'Funcional y spinning', price: 25000, classesMode: 'SELECTED', classNames: ['Funcional', 'Spinning'], weeklyLimit: 3 });
  });

  it('el precio y el límite son opcionales', () => {
    expect(cleanPlan({ name: 'Pase libre', classesMode: 'ALL' })).toEqual({ name: 'Pase libre', description: '', price: null, classesMode: 'ALL', classNames: [], weeklyLimit: null });
  });

  it('rechaza lo que no sirve', () => {
    expect(cleanPlan({ name: 'A' })).toEqual({ error: 'NAME' });
    expect(cleanPlan({ name: 'Plan', price: '-5' })).toEqual({ error: 'PRICE' });
    expect(cleanPlan({ name: 'Plan', classesMode: 'SELECTED', classNames: [] })).toEqual({ error: 'CLASSES' });
    expect(cleanPlan({ name: 'Plan', weeklyLimit: 0 })).toEqual({ error: 'LIMIT' });
    expect(cleanPlan({ name: 'Plan', weeklyLimit: 99 })).toEqual({ error: 'LIMIT' });
  });

  it('si incluye todas las clases, descarta los nombres sueltos', () => {
    const r = cleanPlan({ name: 'Libre', classesMode: 'ALL', classNames: ['Yoga'] });
    expect(r).toMatchObject({ classNames: [] });
  });
});

describe('resumen de un plan', () => {
  it('lo cuenta en palabras', () => {
    expect(describePlan(funcional)).toEqual({ classes: 'Solo: Funcional, Spinning', weekly: '3 reservas por semana' });
    expect(describePlan(libre)).toEqual({ classes: 'Todas las clases', weekly: 'Reservas sin límite' });
  });
});
