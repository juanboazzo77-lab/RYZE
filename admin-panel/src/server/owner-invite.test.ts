import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('@/lib/supabase-admin', () => ({ createSupabaseAdminClient: () => ({}), supabaseAdminConfigured: () => true }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('./alerts', () => ({ sendMail: async () => true }));
vi.mock('./gyms', () => ({ setGymOwner: async () => ({ ok: true }) }));

import { inviteEmail, passwordLink } from './owner-invite';

describe('invitación a dueños de gimnasio', () => {
  it('el enlace va al panel y valida el token (después se elige la contraseña)', () => {
    const link = passwordLink('abc123', 'https://panel.example/');
    expect(link).toBe('https://panel.example/auth/confirm?token_hash=abc123&type=recovery');
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
    expect(m.text).not.toContain('token_hash');
    expect(m.text).toContain('/login');
  });
});
