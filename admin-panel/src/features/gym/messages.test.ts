import { describe, expect, it } from 'vitest';
import { cleanMessage } from './messages';

describe('mensajes del gimnasio a sus clientes', () => {
  it('acepta un mensaje y limpia los espacios', () => {
    expect(cleanMessage({ title: '  El lunes es feriado ', body: 'Abrimos de 9 a 13.', email: true })).toEqual({ title: 'El lunes es feriado', body: 'Abrimos de 9 a 13.', email: true });
  });
  it('el mail es opcional y viene apagado', () => {
    expect(cleanMessage({ title: 'Hola', body: 'Un mensaje' })).toMatchObject({ email: false });
  });
  it('rechaza sin título o sin mensaje', () => {
    expect(cleanMessage({ title: 'Ho', body: 'Un mensaje' })).toEqual({ error: 'TITLE' });
    expect(cleanMessage({ title: 'Hola', body: ' ' })).toEqual({ error: 'BODY' });
  });
});
