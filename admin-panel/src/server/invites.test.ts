import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('./db', () => ({ prisma: {} }));
vi.mock('./alerts', () => ({ sendMail: async () => true }));

import { invitationEmail } from './invites';

describe('mail de invitación a un socio', () => {
  const m = invitationEmail('Gym Norte');

  it('lleva el nombre del gimnasio en el asunto', () => {
    expect(m.subject).toBe('Gym Norte te invita a Forza AI');
  });

  it('cuenta qué recibe: entrenamiento, dieta y mensajes con la IA', () => {
    expect(m.text).toContain('plan de entrenamiento por mes');
    expect(m.text).toContain('plan de dieta por mes');
    expect(m.text).toContain('Mensajes con la IA');
  });

  it('dice que es gratis y cómo empezar con el mismo mail', () => {
    expect(m.text).toContain('gratis para vos');
    expect(m.text).toContain('/register');
    expect(m.text).toContain('ESTE mismo mail');
  });

  it('avisa que se puede ignorar si no lo esperaba', () => {
    expect(m.text).toContain('ignoralo');
  });
});
