import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { normalizePurchaseBase, webPurchaseProblem, webPurchaseUrlFor } from './gym-referrals';

describe('enlace de compra de la web', () => {
  it('suma el identificador de la persona al final', () => {
    expect(webPurchaseUrlFor('abc-123', 'https://pay.rev.cat/token123')).toBe('https://pay.rev.cat/token123/abc-123');
    expect(webPurchaseUrlFor('abc-123', 'https://pay.rev.cat/token123/')).toBe('https://pay.rev.cat/token123/abc-123');
  });
  it('si no está configurado o no es https, no hay enlace', () => {
    expect(webPurchaseUrlFor('abc', undefined)).toBeNull();
    expect(webPurchaseUrlFor('abc', '')).toBeNull();
    expect(webPurchaseUrlFor('abc', 'http://pay.rev.cat/x')).toBeNull();
    expect(webPurchaseUrlFor('abc', 'javascript:alert(1)')).toBeNull();
  });
  it('el identificador se escapa', () => {
    expect(webPurchaseUrlFor('a/b c', 'https://pay.rev.cat/t')).toBe('https://pay.rev.cat/t/a%2Fb%20c');
  });
});

describe('limpieza de la dirección pegada', () => {
  it('saca espacios y comillas de más', () => {
    expect(normalizePurchaseBase('  "https://pay.rev.cat/tok"  ')).toBe('https://pay.rev.cat/tok');
    expect(normalizePurchaseBase("'https://pay.rev.cat/tok'")).toBe('https://pay.rev.cat/tok');
  });
  it('si falta el https:// de pay.rev.cat, lo agrega', () => {
    expect(normalizePurchaseBase('pay.rev.cat/tok')).toBe('https://pay.rev.cat/tok');
  });
  it('saca el marcador del usuario que muestra la documentación', () => {
    expect(normalizePurchaseBase('https://pay.rev.cat/tok/<app_user_id>')).toBe('https://pay.rev.cat/tok');
    expect(normalizePurchaseBase('https://pay.rev.cat/tok/<yourAppUserId>')).toBe('https://pay.rev.cat/tok');
    expect(normalizePurchaseBase('https://pay.rev.cat/tok/{app_user_id}/')).toBe('https://pay.rev.cat/tok');
    expect(normalizePurchaseBase('https://pay.rev.cat/tok/APP_USER_ID')).toBe('https://pay.rev.cat/tok');
    expect(webPurchaseUrlFor('u1', 'https://pay.rev.cat/tok/<app_user_id>')).toBe('https://pay.rev.cat/tok/u1');
  });
  it('lo que no es una dirección https sigue sin servir', () => {
    expect(normalizePurchaseBase('http://pay.rev.cat/tok')).toBeNull();
    expect(normalizePurchaseBase('otra-cosa')).toBeNull();
    expect(normalizePurchaseBase('')).toBeNull();
  });
  it('dice por qué falla, sin mostrar el valor', () => {
    expect(webPurchaseProblem('')).toBe('MISSING');
    expect(webPurchaseProblem(undefined)).toBe('MISSING');
    expect(webPurchaseProblem('basura')).toBe('INVALID');
    expect(webPurchaseProblem('https://pay.rev.cat/tok')).toBeNull();
  });
});
