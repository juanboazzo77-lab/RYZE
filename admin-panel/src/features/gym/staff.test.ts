import { describe, expect, it } from 'vitest';
import { cleanStaff, pathAllowed, sectionsFor } from './staff';

describe('equipo del gimnasio: permisos por rol', () => {
  it('el dueño entra a todo', () => {
    for (const p of ['/gym', '/gym/facturacion', '/gym/equipo', '/gym/marca']) expect(pathAllowed('OWNER', p)).toBe(true);
    expect(sectionsFor('OWNER')).toBe('ALL');
  });

  it('recepción ve clientes, cobros, planes, clases y mensajes; no la plata de Forza AI ni la marca ni el equipo', () => {
    for (const p of ['/gym', '/gym/clientes', '/gym/clientes/foto', '/gym/clientes/plantilla', '/gym/cobros', '/gym/cobros/export', '/gym/planes', '/gym/clases', '/gym/mensajes']) {
      expect(pathAllowed('RECEPTION', p)).toBe(true);
    }
    for (const p of ['/gym/facturacion', '/gym/equipo', '/gym/marca', '/gym/equipamiento', '/gym/reportes', '/gym/invitaciones', '/gym/retos']) {
      expect(pathAllowed('RECEPTION', p)).toBe(false);
    }
  });

  it('el profe ve clases, retos, rutinas y quién entrena; no clientes ni cobros', () => {
    for (const p of ['/gym', '/gym/clases', '/gym/retos', '/gym/rutinas', '/gym/socios']) expect(pathAllowed('COACH', p)).toBe(true);
    for (const p of ['/gym/clientes', '/gym/cobros', '/gym/planes', '/gym/equipo', '/gym/facturacion']) expect(pathAllowed('COACH', p)).toBe(false);
  });

  it('no se cuela con direcciones parecidas', () => {
    expect(pathAllowed('COACH', '/gym/clasesx')).toBe(false);
    expect(pathAllowed('RECEPTION', '/gym/cobrosextra')).toBe(false);
    expect(pathAllowed('COACH', '/gymnasio')).toBe(false);
  });

  it('valida el alta de una persona del equipo', () => {
    expect(cleanStaff({ email: ' Ana@Gmail.com ', role: 'COACH' })).toEqual({ email: 'ana@gmail.com', role: 'COACH' });
    expect(cleanStaff({ email: 'no-es-mail', role: 'COACH' })).toEqual({ error: 'EMAIL' });
    expect(cleanStaff({ email: 'a@b.com', role: 'OWNER' })).toEqual({ error: 'ROLE' });
  });
});
