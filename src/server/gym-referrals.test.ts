import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { webPurchaseUrlFor } from './gym-referrals';

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
