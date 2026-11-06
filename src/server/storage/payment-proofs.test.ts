import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('../supabase/server', () => ({ createSupabaseAdminClient: () => ({}) }));

import { isProofPathOf, MAX_PROOF_BYTES } from './payment-proofs';

const GYM = '11111111-2222-3333-4444-555555555555';
const OTHER = '99999999-2222-3333-4444-555555555555';
const FILE = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('comprobantes de pago', () => {
  it('acepta una ruta de comprobante de ese gimnasio', () => {
    for (const ext of ['jpg', 'png', 'webp', 'pdf']) {
      expect(isProofPathOf(GYM, `${GYM}/${FILE}.${ext}`)).toBe(true);
    }
  });

  it('rechaza el comprobante de otro gimnasio', () => {
    expect(isProofPathOf(GYM, `${OTHER}/${FILE}.pdf`)).toBe(false);
  });

  it('rechaza rutas que intentan salirse de la carpeta o de otro tipo', () => {
    expect(isProofPathOf(GYM, `${GYM}/../${OTHER}/${FILE}.pdf`)).toBe(false);
    expect(isProofPathOf(GYM, `${GYM}/${FILE}.exe`)).toBe(false);
    expect(isProofPathOf(GYM, `${GYM}/archivo.pdf`)).toBe(false);
    expect(isProofPathOf(GYM, '')).toBe(false);
  });

  it('el tope de tamaño es de 4 MB', () => {
    expect(MAX_PROOF_BYTES).toBe(4 * 1024 * 1024);
  });
});
