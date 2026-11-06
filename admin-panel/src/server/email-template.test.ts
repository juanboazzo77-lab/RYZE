import { describe, expect, it } from 'vitest';
import { composeEmail, escapeHtml } from './email-template';

const base = { subject: 'Asunto', heading: 'Título', preheader: 'Vista previa' };

describe('composeEmail', () => {
  it('arma HTML con logo, título, botón y pie', () => {
    const m = composeEmail({ ...base, blocks: [{ type: 'p', text: 'Hola' }, { type: 'button', label: 'Entrar', url: 'https://x.test/a?b=1&c=2' }] });
    expect(m.html).toContain('forzaai.app/brand/logo.png');
    expect(m.html).toContain('Título');
    expect(m.html).toContain('href="https://x.test/a?b=1&amp;c=2"');
    expect(m.html).toContain('Vista previa');
    expect(m.html).toContain('soporte@forzaai.app');
  });

  it('el texto plano lleva lo mismo: título, párrafos, listas, pasos y el enlace del botón', () => {
    const m = composeEmail({
      ...base,
      blocks: [
        { type: 'p', text: 'Hola' },
        { type: 'list', items: ['uno', 'dos'] },
        { type: 'steps', items: ['primero', 'segundo'] },
        { type: 'button', label: 'Entrar', url: 'https://x.test/y' },
      ],
    });
    expect(m.text).toContain('Título');
    expect(m.text).toContain('- uno');
    expect(m.text).toContain('2. segundo');
    expect(m.text).toContain('Entrar: https://x.test/y');
    expect(m.text).toContain('Equipo de Forza AI');
  });

  it('escapa el HTML de lo que escribe la gente (nombres de gimnasio, etc.)', () => {
    const m = composeEmail({ ...base, heading: '<b>Hola</b>', blocks: [{ type: 'p', text: '<script>alert(1)</script>' }] });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
    expect(escapeHtml('a & "b"')).toBe('a &amp; &quot;b&quot;');
  });

  it('un enlace que no es http(s) no se convierte en botón', () => {
    const m = composeEmail({ ...base, blocks: [{ type: 'button', label: 'X', url: 'javascript:alert(1)' }] });
    expect(m.html).not.toContain('javascript:');
  });
});
