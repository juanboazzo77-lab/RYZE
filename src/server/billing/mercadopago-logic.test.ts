import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildPreapprovalBody, DEFAULT_PRICE_ARS, grantsAccess, mapMpStatus, payerEmailFor, priceFromEnv, verifyMpSignature } from './mercadopago-logic';

describe('estados de Mercado Pago', () => {
  it('traduce los estados conocidos', () => {
    expect(mapMpStatus('authorized')).toBe('AUTHORIZED');
    expect(mapMpStatus('Authorized')).toBe('AUTHORIZED');
    expect(mapMpStatus('paused')).toBe('PAUSED');
    expect(mapMpStatus('cancelled')).toBe('CANCELLED');
    expect(mapMpStatus('canceled')).toBe('CANCELLED');
    expect(mapMpStatus('pending')).toBe('PENDING');
  });
  it('lo desconocido queda pendiente y sin acceso', () => {
    expect(mapMpStatus('algo-raro')).toBe('PENDING');
    expect(mapMpStatus(null)).toBe('PENDING');
    expect(grantsAccess(mapMpStatus('algo-raro'))).toBe(false);
  });
  it('solo la suscripción autorizada da acceso', () => {
    expect(grantsAccess('AUTHORIZED')).toBe(true);
    for (const s of ['PENDING', 'PAUSED', 'CANCELLED', null, undefined]) expect(grantsAccess(s)).toBe(false);
  });
});

describe('precio', () => {
  it('por defecto $9.000', () => {
    expect(DEFAULT_PRICE_ARS).toBe(9000);
    expect(priceFromEnv(undefined)).toBe(9000);
    expect(priceFromEnv('')).toBe(9000);
  });
  it('acepta un valor razonable de la variable', () => {
    expect(priceFromEnv('7500')).toBe(7500);
    expect(priceFromEnv('7500,50')).toBe(7500.5);
  });
  it('rechaza valores absurdos y vuelve a $9.000', () => {
    expect(priceFromEnv('0')).toBe(9000);
    expect(priceFromEnv('-5')).toBe(9000);
    expect(priceFromEnv('barato')).toBe(9000);
    expect(priceFromEnv('999999999')).toBe(9000);
  });
});

describe('pedido de la suscripción', () => {
  const body = buildPreapprovalBody({ userId: 'u-1', email: 'ana@ejemplo.com', priceArs: 5000, backUrl: 'https://www.forzaai.app/g/ABCD2345?pago=ok' });
  it('cobra todos los meses en pesos', () => {
    expect(body.auto_recurring).toEqual({ frequency: 1, frequency_type: 'months', transaction_amount: 5000, currency_id: 'ARS' });
  });
  it('lleva el identificador de la persona para reconocer los avisos', () => {
    expect(body.external_reference).toBe('u-1');
    expect(body.payer_email).toBe('ana@ejemplo.com');
  });
  it('queda pendiente hasta que la persona la autoriza', () => {
    expect(body.status).toBe('pending');
    expect(body.back_url).toContain('/g/ABCD2345');
  });
});

describe('firma de los avisos', () => {
  const secret = 'secreto-de-prueba';
  const sign = (id: string, requestId: string, ts: string) => createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');

  it('acepta una firma correcta', () => {
    const v1 = sign('abc123', 'req-1', '1700000000');
    expect(verifyMpSignature({ signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: 'ABC123', secret })).toBe(true);
  });
  it('rechaza una firma falsa, de otro dato o con otro secreto', () => {
    const v1 = sign('abc123', 'req-1', '1700000000');
    expect(verifyMpSignature({ signatureHeader: 'ts=1700000000,v1=00', requestId: 'req-1', dataId: 'abc123', secret })).toBe(false);
    expect(verifyMpSignature({ signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: 'otro', secret })).toBe(false);
    expect(verifyMpSignature({ signatureHeader: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: 'abc123', secret: 'otro-secreto' })).toBe(false);
    expect(verifyMpSignature({ signatureHeader: `ts=1700000001,v1=${v1}`, requestId: 'req-1', dataId: 'abc123', secret })).toBe(false);
  });
  it('sin secreto o sin encabezado no se puede comprobar', () => {
    expect(verifyMpSignature({ signatureHeader: null, requestId: 'r', dataId: 'a', secret })).toBe(false);
    expect(verifyMpSignature({ signatureHeader: 'ts=1,v1=2', requestId: 'r', dataId: 'a', secret: undefined })).toBe(false);
    expect(verifyMpSignature({ signatureHeader: 'basura', requestId: 'r', dataId: 'a', secret })).toBe(false);
  });
});

describe('mail del pagador', () => {
  it('normalmente es el de la persona', () => {
    expect(payerEmailFor('ana@ejemplo.com', undefined)).toBe('ana@ejemplo.com');
    expect(payerEmailFor('ana@ejemplo.com', '')).toBe('ana@ejemplo.com');
  });
  it('para probar, se puede forzar el del comprador de prueba', () => {
    expect(payerEmailFor('ana@ejemplo.com', ' test_user_1@testuser.com ')).toBe('test_user_1@testuser.com');
  });
  it('un valor que no es un mail se ignora', () => {
    expect(payerEmailFor('ana@ejemplo.com', 'no-es-mail')).toBe('ana@ejemplo.com');
  });
});
