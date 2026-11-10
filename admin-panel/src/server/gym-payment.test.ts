import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));

import { gymLandingUrl } from './gym-payment';

describe('página web del gimnasio', () => {
  it('arma la dirección con el código en mayúsculas', () => {
    expect(gymLandingUrl('abcd2345', 'https://www.forzaai.app')).toBe('https://www.forzaai.app/g/ABCD2345');
    expect(gymLandingUrl('ABCD2345', 'https://www.forzaai.app/')).toBe('https://www.forzaai.app/g/ABCD2345');
  });
  it('sin dirección configurada usa la de Forza AI', () => {
    expect(gymLandingUrl('ABCD2345', '')).toBe('https://www.forzaai.app/g/ABCD2345');
  });
  it('sin código, o con uno raro, no hay dirección', () => {
    expect(gymLandingUrl(null)).toBeNull();
    expect(gymLandingUrl('')).toBeNull();
    expect(gymLandingUrl('ab')).toBeNull();
    expect(gymLandingUrl('AB CD/../x')).toBeNull();
  });
});
