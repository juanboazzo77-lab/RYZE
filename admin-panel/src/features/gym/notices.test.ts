import { describe, expect, it } from 'vitest';
import { cleanNotice, noticeAppliesTo } from './notices';

const ID1 = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

describe('avisos a los gimnasios', () => {
  it('acepta un aviso completo', () => {
    const r = cleanNotice({ title: ' Mantenimiento ', body: 'El sábado el panel va a estar apagado unos minutos.', link: 'https://forzaai.app/novedades', gymIds: [ID1, ID1, 'no-es-un-id'], email: true });
    expect(r).toEqual({ title: 'Mantenimiento', body: 'El sábado el panel va a estar apagado unos minutos.', link: 'https://forzaai.app/novedades', gymIds: [ID1], email: true });
  });

  it('el enlace es opcional y, si está, tiene que ser http o https', () => {
    expect(cleanNotice({ title: 'Hola', body: 'Un mensaje corto' })).toMatchObject({ link: null, gymIds: [], email: false });
    expect(cleanNotice({ title: 'Hola', body: 'Un mensaje corto', link: 'javascript:alert(1)' })).toEqual({ error: 'LINK' });
    expect(cleanNotice({ title: 'Hola', body: 'Un mensaje corto', link: 'ftp://x.com' })).toEqual({ error: 'LINK' });
  });

  it('rechaza avisos sin título o sin mensaje', () => {
    expect(cleanNotice({ title: 'Ho', body: 'Un mensaje corto' })).toEqual({ error: 'TITLE' });
    expect(cleanNotice({ title: 'Hola', body: '  ' })).toEqual({ error: 'BODY' });
  });

  it('un aviso sin gimnasios elegidos es para todos', () => {
    expect(noticeAppliesTo({ gymIds: [] }, ID1)).toBe(true);
    expect(noticeAppliesTo({ gymIds: [ID1] }, ID1)).toBe(true);
    expect(noticeAppliesTo({ gymIds: [ID1] }, ID2)).toBe(false);
  });
});
