import { describe, expect, it } from 'vitest';
import { cleanMessage } from './messages';

describe('mensajes del gimnasio a sus clientes', () => {
  it('acepta un mensaje y limpia los espacios', () => {
    expect(cleanMessage({ title: '  El lunes es feriado ', body: 'Abrimos de 9 a 13.', days: 3 })).toEqual({ title: 'El lunes es feriado', body: 'Abrimos de 9 a 13.', days: 3 });
  });
  it('se muestra 7 días si no se elige, y solo valen las duraciones permitidas', () => {
    expect(cleanMessage({ title: 'Hola', body: 'Un mensaje' })).toMatchObject({ days: 7 });
    expect(cleanMessage({ title: 'Hola', body: 'Un mensaje', days: 400 })).toMatchObject({ days: 7 });
    expect(cleanMessage({ title: 'Hola', body: 'Un mensaje', days: 30 })).toMatchObject({ days: 30 });
  });
  it('rechaza sin título o sin mensaje', () => {
    expect(cleanMessage({ title: 'Ho', body: 'Un mensaje' })).toEqual({ error: 'TITLE' });
    expect(cleanMessage({ title: 'Hola', body: ' ' })).toEqual({ error: 'BODY' });
  });
});
