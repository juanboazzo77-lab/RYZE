import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: () => ({}), supabaseAdminConfigured: () => true }));
vi.mock('./alerts', () => ({ sendMail: async () => true }));
vi.mock('./gyms', () => ({ setGymOwner: async () => ({ ok: true }) }));

import { inviteEmail, passwordLink } from './owner-invite';

describe('invitación a dueños de gimnasio', () => {
  it('el enlace va a la app, valida el token y sigue a elegir contraseña', () => {
    const link = passwordLink('abc123');
    expect(link).toContain('/auth/confirm?token_hash=abc123');
    expect(link).toContain('type=recovery');
    expect(link).toContain(encodeURIComponent('/reset-password'));
  });

  it('el token se escapa para no romper el enlace', () => {
    expect(passwordLink('a b&c')).toContain('token_hash=a%20b%26c');
  });

  it('a una cuenta nueva le manda el enlace para elegir contraseña', () => {
    const m = inviteEmail({ gymName: 'Gym Norte', created: true, link: 'https://x/y' });
    expect(m.subject).toContain('Gym Norte');
    expect(m.text).toContain('https://x/y');
    expect(m.text).toContain('Elegí tu contraseña');
  });

  it('a una cuenta que ya existía solo le avisa, sin enlace ni contraseña', () => {
    const m = inviteEmail({ gymName: 'Gym Norte', created: false });
    expect(m.text).not.toContain('http');
    expect(m.text).toContain('Mi gimnasio');
  });
});
