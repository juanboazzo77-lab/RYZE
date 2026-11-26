import { describe, expect, it } from 'vitest';
import { readCall, type RpcTable } from './rpc-call';

const table: RpcTable = { 'coach.hola': async () => async () => 'ok' };

describe('puerta de funciones de la app', () => {
  it('sólo deja llamar lo que está en la lista', () => {
    expect(readCall(table, { action: 'coach.hola', args: [] }).status).toBe('ok');
    for (const action of ['coach.chau', 'constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(readCall(table, { action, args: [] }).status).toBe('unknown');
    }
  });

  it('rechaza pedidos mal armados', () => {
    for (const body of [null, 'x', {}, { action: 'coach.hola' }, { action: 1, args: [] }, { action: 'coach.hola', args: {} }, { action: 'coach.hola', args: [1, 2, 3] }]) {
      expect(readCall(table, body).status).toBe('invalid');
    }
  });
});
