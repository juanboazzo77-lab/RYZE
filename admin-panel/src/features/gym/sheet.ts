/**
 * Cargar clientes desde la foto de una hoja anotada a mano. La IA transcribe la hoja y acá se limpia lo que devuelve:
 * cada renglón queda como una línea "Nombre, mail, teléfono, cuota, vencimiento", el mismo formato que usa la carga por
 * texto (así el dueño la revisa y la corrige antes de cargarla). Funciones puras.
 */

export interface SheetRow {
  nombre?: unknown;
  mail?: unknown;
  telefono?: unknown;
  plan?: unknown;
  cuota?: unknown;
  vence?: unknown;
}

export const MAX_ROWS_PER_PHOTO = 60;

const clean = (v: unknown, max: number): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : '').replace(/[,;\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

/** Saca el JSON de lo que contestó el modelo (con o sin texto alrededor). Devuelve los renglones o null. */
export function parseSheetReply(text: string): SheetRow[] | null {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    const data = JSON.parse(text.slice(a, b + 1)) as { clientes?: unknown };
    return Array.isArray(data.clientes) ? (data.clientes as SheetRow[]) : null;
  } catch {
    return null;
  }
}

/** Los renglones transcriptos, ya limpios, como líneas de texto para la carga de clientes. */
export function sheetRowsToLines(rows: SheetRow[]): string[] {
  const lines: string[] = [];
  for (const r of rows.slice(0, MAX_ROWS_PER_PHOTO)) {
    const name = clean(r.nombre, 120);
    // Un renglón sin nombre (o con un mail en el lugar del nombre) no sirve.
    if (name.length < 2 || name.includes('@')) continue;
    const email = clean(r.mail, 160).toLowerCase();
    const phone = clean(r.telefono, 40);
    const plan = clean(r.plan, 60);
    const fee = clean(r.cuota, 14).replace(/[^\d.,]/g, '');
    const due = clean(r.vence, 12);
    const parts = [
      name,
      /^[\d\s()+\-]{6,}$/.test(phone) ? phone : '',
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : '',
      plan ? `Plan: ${plan}` : '',
      fee,
      /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(due) ? due : '',
    ].filter(Boolean);
    lines.push(parts.join(', '));
  }
  return lines;
}
