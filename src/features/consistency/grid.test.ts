import { describe, expect, it } from 'vitest';
import { buildYearGrid, longestStreak, yearsToShow } from './grid';

describe('buildYearGrid', () => {
  it('2026 empieza un jueves: con semana desde el lunes, el 1 de enero cae en la fila 3 de la primera columna', () => {
    const g = buildYearGrid(2026, new Set(), '2026-12-31', 1);
    expect(g.cells[0]).toMatchObject({ dateISO: '2026-01-01', col: 0, row: 3 });
    expect(g.cells.at(-1)).toMatchObject({ dateISO: '2026-12-31', row: 3 });
    expect(g.cells).toHaveLength(365);
  });

  it('con semana desde el domingo el mismo día cae en otra fila', () => {
    const g = buildYearGrid(2026, new Set(), '2026-12-31', 7);
    expect(g.cells[0]).toMatchObject({ dateISO: '2026-01-01', col: 0, row: 4 });
  });

  it('un año bisiesto tiene 366 días', () => {
    expect(buildYearGrid(2024, new Set(), '2026-01-01', 1).cells).toHaveLength(366);
  });

  it('marca entrenado, descanso y futuro', () => {
    const g = buildYearGrid(2026, new Set(['2026-01-05', '2026-12-20']), '2026-06-15', 1);
    const state = (iso: string) => g.cells.find((c) => c.dateISO === iso)?.state;
    expect(state('2026-01-05')).toBe('trained');
    expect(state('2026-01-06')).toBe('rest');
    expect(state('2026-06-15')).toBe('rest');
    expect(state('2026-06-16')).toBe('future');
    // un día entrenado "en el futuro" (por un desfase de zona horaria) no se pinta como entrenado
    expect(state('2026-12-20')).toBe('future');
    expect(g.trainedDays).toBe(1);
  });

  it('da una marca por mes en la columna de su día 1', () => {
    const g = buildYearGrid(2026, new Set(), '2026-12-31', 1);
    expect(g.months).toHaveLength(12);
    expect(g.months[0]).toEqual({ month: 1, col: 0 });
    const feb1 = g.cells.find((c) => c.dateISO === '2026-02-01')!;
    expect(g.months[1]).toEqual({ month: 2, col: feb1.col });
    expect(g.cols).toBeGreaterThanOrEqual(53);
  });

  it('nunca dos días comparten celda', () => {
    const g = buildYearGrid(2026, new Set(), '2026-12-31', 3);
    const keys = new Set(g.cells.map((c) => `${c.col}:${c.row}`));
    expect(keys.size).toBe(g.cells.length);
  });
});

describe('yearsToShow', () => {
  it('sin entrenos muestra sólo el año actual', () => {
    expect(yearsToShow(new Set(), '2026-11-24')).toEqual([2026]);
  });
  it('va del año actual al del primer entreno, el más nuevo primero', () => {
    expect(yearsToShow(new Set(['2024-03-01', '2026-01-02']), '2026-11-24')).toEqual([2026, 2025, 2024]);
  });
  it('respeta el tope', () => {
    expect(yearsToShow(new Set(['2015-01-01']), '2026-11-24', 5)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });
});

describe('longestStreak', () => {
  it('0 sin entrenos', () => {
    expect(longestStreak(new Set())).toBe(0);
  });
  it('encuentra la racha más larga, cruzando meses', () => {
    const days = new Set(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02', '2026-03-10', '2026-03-11']);
    expect(longestStreak(days)).toBe(4);
  });
  it('un día suelto es una racha de 1', () => {
    expect(longestStreak(new Set(['2026-05-05']))).toBe(1);
  });
});
