import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('./gym-clients', () => ({ listClients: async () => [] }));

import { csvCell, paymentsCsv } from './gym-finance';

describe('exportar pagos a Excel', () => {
  it('las celdas van entre comillas y las comillas se duplican', () => {
    expect(csvCell('Ana "la" Pérez')).toBe('"Ana ""la"" Pérez"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(25000)).toBe('"25000"');
  });

  it('un nombre que empieza como fórmula no se ejecuta en Excel', () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell('+54 9 11')).toBe('"\'+54 9 11"');
  });

  it('el archivo trae BOM, encabezados y una fila por pago, con ; de separador', () => {
    const csv = paymentsCsv([{ paidOn: '2026-11-02', amount: 20000, clientName: 'Ana', months: 1 }]);
    expect(csv.startsWith('﻿"Fecha";"Cliente";"Importe";"Meses"')).toBe(true);
    expect(csv).toContain('"2026-11-02";"Ana";"20000";"1"');
  });
});
