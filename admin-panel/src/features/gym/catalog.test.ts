import { describe, expect, it } from 'vitest';
import { EQUIPMENT_GROUPS, SPECIALTIES, gymContextLines, parseGymProfile, specialtyByKey } from './catalog';

describe('catálogo del gimnasio', () => {
  it('no repite claves de equipamiento ni de especialidad', () => {
    const keys = EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(SPECIALTIES.map((s) => s.key)).size).toBe(SPECIALTIES.length);
  });

  it('mantiene las claves que los gimnasios ya cargaron', () => {
    const legacy = ['barbell','dumbbells','kettlebells','squat_rack','bench_flat','bench_adjustable','bench_decline','preacher','hip_thrust','ez_bar','trap_bar','leg_press','hack_squat','leg_extension','leg_curl','hip_abductor','calf_machine','chest_press','pec_deck','shoulder_press','lat_pulldown','seated_row','cable_crossover','smith','assisted_pullup','biceps_machine','triceps_machine','ab_machine','back_extension','pullup_bar','rings','plyo_box','battle_ropes','sled','medicine_ball','trx','landmine','heavy_bag','rower','assault_bike','ski_erg','treadmill','bike','elliptical','stair_climber','spinning','bands','mats','fitball','foam_roller','pool','turf'];
    const keys = new Set(EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.key)));
    for (const k of legacy) expect(keys.has(k)).toBe(true);
  });

  it('tiene un catálogo amplio de máquinas', () => {
    const total = EQUIPMENT_GROUPS.reduce((n, g) => n + g.items.length, 0);
    expect(total).toBeGreaterThanOrEqual(120);
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
