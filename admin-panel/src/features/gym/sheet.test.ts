import { describe, expect, it } from 'vitest';
import { parseSheetReply, sheetRowsToLines } from './sheet';
import { parseClientLines } from './fees';

describe('hoja de clientes anotada a mano', () => {
  it('saca el JSON aunque el modelo escriba texto alrededor', () => {
    const rows = parseSheetReply('Acá está:\n```json\n{"clientes":[{"nombre":"Ana Pérez"}]}\n```');
    expect(rows).toEqual([{ nombre: 'Ana Pérez' }]);
  });

  it('devuelve null si no hay JSON o está roto', () => {
    expect(parseSheetReply('no pude leer la hoja')).toBeNull();
    expect(parseSheetReply('{"clientes": [')).toBeNull();
    expect(parseSheetReply('{"otra":1}')).toBeNull();
  });

  it('arma una línea por cliente en el formato de la carga por texto', () => {
    const lines = sheetRowsToLines([
      { nombre: 'Ana Pérez', mail: 'ANA@Gmail.com', telefono: '11 5555-1234', cuota: '25000', vence: '20/11/2026' },
      { nombre: 'Luis Gómez', mail: null, telefono: null, cuota: null, vence: null },
    ]);
    expect(lines).toEqual(['Ana Pérez, ana@gmail.com, 11 5555-1234, 25000, 20/11/2026', 'Luis Gómez']);
    // y esas líneas las entiende la carga de clientes
    const parsed = parseClientLines(lines.join('\n'));
    expect(parsed.invalid).toEqual([]);
    expect(parsed.valid).toHaveLength(2);
    expect(parsed.valid[0]).toMatchObject({ name: 'Ana Pérez', email: 'ana@gmail.com', paidUntil: '2026-11-20', fee: 25000 });
  });

  it('descarta renglones sin nombre y datos que no son válidos, sin romper las comas', () => {
    const lines = sheetRowsToLines([
      { nombre: '', mail: 'x@y.com' },
      { nombre: 'ana@gmail.com' },
      { nombre: 'Marta, Ruiz', mail: 'no es mail', telefono: 'abc', cuota: '$ 18.000', vence: '31-12' },
    ]);
    expect(lines).toEqual(['Marta Ruiz, 18.000']);
  });

  it('corta en 60 renglones por foto', () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({ nombre: `Cliente ${i + 1}` }));
    expect(sheetRowsToLines(rows)).toHaveLength(60);
  });
});
