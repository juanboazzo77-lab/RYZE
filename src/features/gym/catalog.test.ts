import { describe, expect, it } from 'vitest';
import { EQUIPMENT_GROUPS, SPECIALTIES, gymContextLines, parseGymProfile, specialtyByKey } from './catalog';

describe('catálogo del gimnasio', () => {
  it('no repite claves de equipamiento ni de especialidad', () => {
    const keys = EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(SPECIALTIES.map((s) => s.key)).size).toBe(SPECIALTIES.length);
  });

  it('lee lo guardado ignorando claves inventadas y duplicados', () => {
    const p = parseGymProfile({ items: ['barbell', 'barbell', 'nave_espacial', 5], notes: 'Mancuernas hasta 40 kg', specialtyDetail: 'rugby' });
    expect(p.items).toEqual(['barbell']);
    expect(p.notes).toBe('Mancuernas hasta 40 kg');
    expect(p.specialtyDetail).toBe('rugby');
  });

  it('con datos raros devuelve un perfil vacío', () => {
    expect(parseGymProfile(null)).toEqual({ items: [], notes: '', specialtyDetail: '' });
    expect(parseGymProfile('hola')).toEqual({ items: [], notes: '', specialtyDetail: '' });
    expect(parseGymProfile([1, 2])).toEqual({ items: [], notes: '', specialtyDetail: '' });
  });

  it('encuentra la especialidad por clave', () => {
    expect(specialtyByKey('CROSSFIT')?.label).toBe('CrossFit');
    expect(specialtyByKey('xx')).toBeNull();
    expect(specialtyByKey(null)).toBeNull();
  });

  it('le pide a la IA usar sólo lo que el gimnasio tiene', () => {
    const lines = gymContextLines({
      name: 'Gym Norte',
      specialty: 'CROSSFIT',
      profile: { items: ['barbell', 'rings'], notes: '', specialtyDetail: '' },
    }).join('\n');
    expect(lines).toContain('Gimnasio del socio: Gym Norte');
    expect(lines).toContain('Especialidad del gimnasio: CrossFit');
    expect(lines).toContain('Barras olímpicas y discos; Anillas');
    expect(lines).toContain('No uses equipamiento que el gimnasio no tiene');
  });

  it('sin máquinas cargadas no inventa límites', () => {
    const lines = gymContextLines({ name: 'Gym Sur', specialty: null, profile: { items: [], notes: '', specialtyDetail: '' } }).join('\n');
    expect(lines).toContain('todavía no cargó sus máquinas');
    expect(lines).not.toContain('SOLO esto');
  });
});
