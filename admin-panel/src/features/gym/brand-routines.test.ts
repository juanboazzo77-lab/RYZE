import { describe, expect, it } from 'vitest';
import { normalizeHexColor, readableOn, safeLogoUrl, sniffImage } from './brand';
import { cleanRoutine, countExercises, levelLabel, parseRoutineDays } from './routines';

describe('colores de marca', () => {
  it('normaliza a #rrggbb', () => {
    expect(normalizeHexColor('#1D9A5F')).toBe('#1d9a5f');
    expect(normalizeHexColor('f80')).toBe('#ff8800');
    expect(normalizeHexColor(' #abc ')).toBe('#aabbcc');
  });
  it('rechaza lo que no es un color', () => {
    expect(normalizeHexColor('rojo')).toBeNull();
    expect(normalizeHexColor('#12345')).toBeNull();
    expect(normalizeHexColor('red; background:url(x)')).toBeNull();
    expect(normalizeHexColor(null)).toBeNull();
  });
  it('elige texto blanco sobre fondos oscuros y oscuro sobre claros', () => {
    expect(readableOn('#000000')).toBe('#ffffff');
    expect(readableOn('#1d9a5f')).toBe('#ffffff');
    expect(readableOn('#ffffff')).toBe('#111111');
    expect(readableOn('#ffe600')).toBe('#111111');
  });
});

describe('logo', () => {
  it('solo acepta direcciones https', () => {
    expect(safeLogoUrl('https://x.supabase.co/a.png')).toBe('https://x.supabase.co/a.png');
    expect(safeLogoUrl('javascript:alert(1)')).toBeNull();
    expect(safeLogoUrl('http://x.com/a.png')).toBeNull();
    expect(safeLogoUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(safeLogoUrl('https://x.com/a b.png')).toBeNull();
  });
  it('reconoce png, jpg y webp por los bytes, y rechaza svg y otros', () => {
    const pad = new Array(20).fill(0);
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...pad]))?.ext).toBe('png');
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...pad]))?.ext).toBe('jpg');
    expect(sniffImage(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...pad]))?.ext).toBe('webp');
    expect(sniffImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImage(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe('rutinas', () => {
  const day = { name: 'Pecho', exercises: [{ name: ' Press banca ', sets: '4', reps: '8-10', note: '' }, { name: '', sets: '3', reps: '10', note: '' }] };

  it('limpia: recorta, saca ejercicios sin nombre y pone nombre a los días vacíos', () => {
    const r = cleanRoutine({ title: '  Fuerza 3 días ', description: ' hola ', level: 'INTERMEDIO', days: [day, { name: '', exercises: [{ name: 'Sentadilla' }] }] })!;
    expect(r.title).toBe('Fuerza 3 días');
    expect(r.level).toBe('INTERMEDIO');
    expect(r.days[0]!.exercises).toHaveLength(1);
    expect(r.days[0]!.exercises[0]!.name).toBe('Press banca');
    expect(r.days[1]!.name).toBe('Día 2');
    expect(countExercises(r.days)).toBe(2);
  });

  it('exige título y al menos un ejercicio', () => {
    expect(cleanRoutine({ title: 'a', days: [day] })).toBeNull();
    expect(cleanRoutine({ title: 'Rutina', days: [] })).toBeNull();
    expect(cleanRoutine({ title: 'Rutina', days: [{ name: 'x', exercises: [{ name: '' }] }] })).toBeNull();
  });

  it('un nivel desconocido queda vacío', () => {
    expect(cleanRoutine({ title: 'Rutina', level: 'DIOS', days: [day] })!.level).toBeNull();
    expect(levelLabel('AVANZADO')).toBe('Avanzado');
    expect(levelLabel('x')).toBeNull();
  });

  it('lo guardado que viene roto se descarta sin romper', () => {
    expect(parseRoutineDays(null)).toEqual([]);
    expect(parseRoutineDays('x')).toEqual([]);
    expect(parseRoutineDays([null, 5, { exercises: 'no' }])).toEqual([]);
  });

  it('respeta los máximos de días y ejercicios', () => {
    const many = Array.from({ length: 12 }, () => ({ name: 'd', exercises: Array.from({ length: 30 }, (_, i) => ({ name: `e${i}` })) }));
    const days = parseRoutineDays(many);
    expect(days).toHaveLength(7);
    expect(days[0]!.exercises).toHaveLength(20);
  });
});

import { brandTheme } from './brand';

describe('tema de la marca', () => {
  it('pone el color del gimnasio en botones y detalles, con un texto que se lee', () => {
    const t = brandTheme('#C0392B')!;
    expect(t['--primary']).toBe('#c0392b');
    expect(t['--primary-foreground']).toBe('#ffffff');
    expect(t['--accent']).toContain('#c0392b');
  });
  it('un color casi blanco o casi negro, o inválido, deja el verde de Forza AI', () => {
    expect(brandTheme('#fafafa')).toBeNull();
    expect(brandTheme('#050505')).toBeNull();
    expect(brandTheme('azul')).toBeNull();
    expect(brandTheme(null)).toBeNull();
  });
});
