/**
 * Búsqueda en la biblioteca guardada en el teléfono. Se parece a la de la web (ignora acentos, prioriza lo que empieza
 * igual y esconde repetidos), pero no corrige errores de tipeo: eso lo hace la base de datos.
 */

export interface Searchable {
  name: string;
  brand: string | null;
  kcalPer100: number;
  verified: boolean;
}

/** Sin acentos, en minúsculas y sin espacios de más. */
export const plainText = (text: string) =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function searchLibrary<T extends Searchable>(foods: T[], query: string, limit = 20): T[] {
  const q = plainText(query);
  if (q.length < 2) return [];
  const words = q.split(' ');

  const matches: Array<{ food: T; name: string; rank: number }> = [];
  for (const food of foods) {
    const name = plainText(food.name);
    const all = `${name} ${plainText(food.brand ?? '')}`;
    if (!words.every((w) => all.includes(w))) continue;
    // 0: el nombre empieza igual · 1: alguna palabra empieza igual · 2: está en el medio.
    const rank = name.startsWith(q) ? 0 : ` ${all}`.includes(` ${words[0]}`) ? 1 : 2;
    matches.push({ food, name, rank });
  }
  matches.sort(
    (a, b) =>
      a.rank - b.rank || Number(b.food.verified) - Number(a.food.verified) || a.name.length - b.name.length || a.name.localeCompare(b.name),
  );

  const seen = new Set<string>();
  const out: T[] = [];
  for (const { food, name } of matches) {
    const key = `${name}|${plainText(food.brand ?? '')}|${Math.round(food.kcalPer100)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(food);
    if (out.length === limit) break;
  }
  return out;
}
