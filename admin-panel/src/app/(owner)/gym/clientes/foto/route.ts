import { getSessionUser } from '@/lib/owner';
import { getOwnedGym } from '@/server/owner';
import { pathAllowed } from '@/features/gym/staff';
import { readClientSheet } from '@/server/ai-sheet';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Tope por persona para que nadie dispare la IA sin límite (por instancia del servidor).
const hits = new Map<string, number[]>();
const MAX_PER_HOUR = 30;
function tooMany(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= MAX_PER_HOUR) return true;
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 500) hits.clear();
  return false;
}

/** Recibe la foto de una hoja de clientes y devuelve las líneas leídas. Solo para el dueño del gimnasio. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const gym = await getOwnedGym(user.userId);
  if (!gym || !pathAllowed(gym.role, '/gym/clientes/foto')) return Response.json({ error: 'UNAUTHORIZED' }, { status: 403 });
  if (tooMany(user.userId)) return Response.json({ error: 'TOO_MANY' }, { status: 429 });

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    file = f instanceof File ? f : null;
  } catch {
    return Response.json({ error: 'INVALID' }, { status: 400 });
  }
  if (!file || !TYPES.has(file.type)) return Response.json({ error: 'BAD_TYPE' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: 'TOO_BIG' }, { status: 413 });

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  const res = await readClientSheet(base64, file.type as 'image/jpeg' | 'image/png' | 'image/webp');
  return 'ok' in res ? Response.json({ lines: res.lines }) : Response.json({ error: res.error }, { status: res.error === 'NOT_CONFIGURED' ? 503 : 422 });
}
