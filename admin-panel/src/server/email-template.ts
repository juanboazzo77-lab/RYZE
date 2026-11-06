/**
 * Plantilla de los mails de Forza AI: logo arriba, tarjeta blanca, botón y pie. Se arma desde bloques, y de los
 * mismos bloques sale la versión en texto plano (para los programas de mail que no muestran diseño).
 * Función pura: no toca la base ni la red.
 */

export type Block =
  | { type: 'p'; text: string }
  /** Lista con viñetas. */
  | { type: 'list'; items: string[] }
  /** Pasos numerados. */
  | { type: 'steps'; items: string[] }
  /** Botón grande con enlace. En el texto plano sale como "Etiqueta: url". */
  | { type: 'button'; label: string; url: string }
  /** Texto chico y gris (avisos, "si no esperabas este mail…"). */
  | { type: 'note'; text: string };

export interface EmailInput {
  subject: string;
  /** Línea que se ve en la bandeja de entrada junto al asunto. */
  preheader?: string;
  /** Título grande dentro del mail. */
  heading: string;
  blocks: Block[];
}

export interface ComposedEmail {
  subject: string;
  text: string;
  html: string;
}

const LOGO_URL = 'https://www.forzaai.app/brand/logo.png';
const GREEN = '#1d9a5f';
const INK = '#161a22';
const MUTED = '#5b6472';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Un enlace solo se pone en el HTML si es http(s): nunca javascript: ni otra cosa. */
function safeUrl(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

function renderText(input: EmailInput): string {
  const out: string[] = [input.heading, ''];
  for (const b of input.blocks) {
    if (b.type === 'p' || b.type === 'note') out.push(b.text, '');
    else if (b.type === 'list') out.push(...b.items.map((i) => `- ${i}`), '');
    else if (b.type === 'steps') out.push(...b.items.map((i, n) => `${n + 1}. ${i}`), '');
    else out.push(`${b.label}: ${b.url}`, '');
  }
  out.push('Equipo de Forza AI · soporte@forzaai.app');
  return out.join('\n');
}

function renderBlock(b: Block): string {
  switch (b.type) {
    case 'p':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:${INK};">${escapeHtml(b.text)}</p>`;
    case 'note':
      return `<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(b.text)}</p>`;
    case 'list':
      return `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:1.55;color:${INK};">${b.items.map((i) => `<li style="margin-bottom:6px;">${escapeHtml(i)}</li>`).join('')}</ul>`;
    case 'steps':
      return `<ol style="margin:0 0 16px;padding-left:22px;font-size:16px;line-height:1.55;color:${INK};">${b.items.map((i) => `<li style="margin-bottom:6px;">${escapeHtml(i)}</li>`).join('')}</ol>`;
    case 'button': {
      const url = safeUrl(b.url);
      if (!url) return '';
      const href = escapeHtml(url);
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="border-radius:10px;background:${GREEN};"><a href="${href}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(b.label)}</a></td></tr></table><p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">Si el botón no funciona, copiá este enlace en tu navegador:<br>${href}</p>`;
    }
  }
}

export function composeEmail(input: EmailInput): ComposedEmail {
  const pre = input.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>` : '';
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f5f7;">${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;"><tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font-family:Arial,Helvetica,sans-serif;"><img src="${LOGO_URL}" width="36" height="36" alt="" style="vertical-align:middle;border-radius:8px;background:#ffffff;border:1px solid #e3e6ea;"> <span style="font-size:18px;font-weight:700;color:${INK};vertical-align:middle;margin-left:8px;">Forza AI</span></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e3e6ea;border-radius:14px;padding:28px 26px;font-family:Arial,Helvetica,sans-serif;">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${INK};">${escapeHtml(input.heading)}</h1>
${input.blocks.map(renderBlock).join('\n')}
</td></tr>
<tr><td style="padding:16px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};text-align:center;">Equipo de Forza AI · <a href="mailto:soporte@forzaai.app" style="color:${MUTED};">soporte@forzaai.app</a></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: input.subject, text: renderText(input), html };
}
