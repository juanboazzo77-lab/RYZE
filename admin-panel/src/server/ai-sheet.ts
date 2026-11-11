import 'server-only';
import { parseSheetReply, sheetRowsToLines } from '@/features/gym/sheet';

/**
 * Lee con IA la foto de una hoja de clientes anotada a mano (la plantilla del panel) y devuelve una línea por cliente.
 * Usa la clave ANTHROPIC_API_KEY del proyecto del panel. No guarda la foto: se la manda al modelo y se descarta.
 */

const API = 'https://api.anthropic.com/v1/messages';

export type SheetError = 'NOT_CONFIGURED' | 'UNREADABLE' | 'FAILED';
export type SheetResult = { ok: true; lines: string[] } | { error: SheetError };

const MODEL = (): string => {
  const v = process.env.AI_VISION_MODEL?.trim();
  return v && /^claude-/.test(v) ? v : 'claude-sonnet-5-5';
};

const PROMPT = `Esta es la foto de una hoja que un gimnasio completó a mano con sus clientes, usando una plantilla con estas columnas, en este orden:
N°, Nombre y apellido, Mail, Teléfono, Plan, Cuota ($), Vence (día/mes/año).
Cada renglón es UN cliente. Transcribí la hoja renglón por renglón, en el mismo orden en que está escrita.

Reglas:
- Respondé SOLO con un JSON de esta forma: {"clientes":[{"nombre":"","mail":"","telefono":"","plan":"","cuota":"","vence":""}]}
- Un objeto por renglón que tenga al menos un nombre. No incluyas el renglón de títulos ni renglones vacíos.
- No inventes nada: si un dato falta o no se lee con seguridad, dejalo vacío ("").
- Cada dato va en su columna. No mezcles datos de renglones distintos.
- "plan" es el nombre del plan tal como está escrito (por ejemplo "Pase libre"), sin cambiarlo.
- "vence" como DD/MM/AAAA (si el año no está, dejalo vacío). "cuota" solo con números. "mail" en minúsculas.
- Si la foto no es una hoja de clientes o no se puede leer, respondé {"clientes":[]}.`;

export async function readClientSheet(imageBase64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<SheetResult> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return { error: 'NOT_CONFIGURED' };
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL(),
        max_tokens: 4000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok) {
      console.error('[hoja-clientes] el modelo respondió', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return { error: 'FAILED' };
    }
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
    const rows = parseSheetReply(text);
    if (!rows) return { error: 'UNREADABLE' };
    const lines = sheetRowsToLines(rows);
    return lines.length > 0 ? { ok: true, lines } : { error: 'UNREADABLE' };
  } catch (e) {
    console.error('[hoja-clientes] no se pudo leer la foto:', e instanceof Error ? e.message : e);
    return { error: 'FAILED' };
  }
}
