import 'server-only';
import { prisma } from '@/server/db';
import { candidateCodes, parseOffMacros, toNumber } from '@/lib/nutrition/off-parse';

/**
 * Abstracción del buscador de alimentos. El MVP resuelve sólo contra la
 * biblioteca local (`food`). Para sumar una API nutricional externa
 * (Open Food Facts, Nutritionix, …) se implementa `FoodProvider` y se
 * agrega a `searchFoods`; los resultados externos se guardan en `food`
 * con `source: 'API'` al seleccionarlos.
 */

export interface FoodSearchResult {
  /** id local si ya existe en `food`; null si viene de una fuente externa. */
  id: string | null;
  name: string;
  brand: string | null;
  source: 'SYSTEM' | 'USER' | 'API';
  externalId: string | null;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  servingQty: number | null;
  servingUnit: string | null;
  servingLabel: string | null;
  verified: boolean;
}

export interface FoodProvider {
  readonly name: string;
  search(query: string, limit: number): Promise<FoodSearchResult[]>;
}

/** Biblioteca local: SYSTEM + los del propio usuario. Prioriza prefijo, luego trigram. */
export function localFoodProvider(userId: string): FoodProvider {
  return {
    name: 'local',
    async search(query, limit) {
      const q = query.trim();
      if (q.length < 2) return [];
      const rows = await prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          brand: string | null;
          source: 'SYSTEM' | 'USER' | 'API';
          external_id: string | null;
          kcal_per_100: number;
          protein_per_100: number;
          carbs_per_100: number;
          fat_per_100: number;
          serving_qty: number | null;
          serving_unit: string | null;
          serving_label: string | null;
          verified: boolean;
        }>
      >`
        SELECT id, name, brand, source, external_id,
               kcal_per_100, protein_per_100, carbs_per_100, fat_per_100,
               serving_qty, serving_unit, serving_label, verified
        FROM "food"
        WHERE (
            unaccent(name) ILIKE unaccent(${'%' + q + '%'})
            OR similarity(unaccent(name), unaccent(${q})) > 0.2
          )
        ORDER BY
          (unaccent(name) ILIKE unaccent(${q + '%'})) DESC,
          COALESCE(created_by = ${userId}::uuid, false) DESC,
          similarity(unaccent(name), unaccent(${q})) DESC,
          verified DESC,
          name ASC
        LIMIT ${limit * 3}
      `;
      // Los alimentos que cargan los usuarios son de todos: se ocultan los repetidos
      // (mismo nombre, marca y calorías) y se queda el primero (el propio, o el verificado).
      const seen = new Set<string>();
      const unique = rows.filter((r) => {
        const key = `${r.name.trim().toLowerCase()}|${(r.brand ?? '').trim().toLowerCase()}|${Math.round(r.kcal_per_100)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return unique.slice(0, limit).map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        source: r.source,
        externalId: r.external_id,
        kcalPer100: r.kcal_per_100,
        proteinPer100: r.protein_per_100,
        carbsPer100: r.carbs_per_100,
        fatPer100: r.fat_per_100,
        servingQty: r.serving_qty,
        servingUnit: r.serving_unit,
        servingLabel: r.serving_label,
        verified: r.verified,
      }));
    },
  };
}

export async function searchFoods(
  userId: string,
  query: string,
  limit = 20,
): Promise<FoodSearchResult[]> {
  // MVP: sólo local. Futuro: mergear con proveedor(es) externo(s).
  return localFoodProvider(userId).search(query, limit);
}

/* ------------------------------------------------------------------ */
/* Código de barras → Open Food Facts                                 */
/* ------------------------------------------------------------------ */

export type BarcodeLookup =
  | { status: 'ok'; food: FoodSearchResult }
  | { status: 'not_found' }
  | { status: 'no_nutriments'; name: string | null }
  | { status: 'error' };

const OFF_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS =
  'code,product_name,product_name_es,product_name_en,generic_name,generic_name_es,abbreviated_product_name,brands,serving_quantity,nutriments';

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function toResult(food: {
  id: string;
  name: string;
  brand: string | null;
  source: 'SYSTEM' | 'USER' | 'API';
  externalId: string | null;
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  servingQty: number | null;
  servingUnit: string | null;
  servingLabel: string | null;
  verified: boolean;
}): FoodSearchResult {
  return {
    id: food.id,
    name: food.name,
    brand: food.brand,
    source: food.source,
    externalId: food.externalId,
    kcalPer100: food.kcalPer100,
    proteinPer100: food.proteinPer100,
    carbsPer100: food.carbsPer100,
    fatPer100: food.fatPer100,
    servingQty: food.servingQty,
    servingUnit: food.servingUnit,
    servingLabel: food.servingLabel,
    verified: food.verified,
  };
}

/**
 * Busca un alimento por código de barras. Primero en la biblioteca local
 * (`food.external_id`); si no está, consulta Open Food Facts y, si el producto
 * trae información nutricional, lo guarda en `food` (`source: 'API'`) para
 * reusarlo después.
 */
type OffProduct = {
  product_name?: string;
  product_name_es?: string;
  product_name_en?: string;
  generic_name?: string;
  generic_name_es?: string;
  abbreviated_product_name?: string;
  brands?: string;
  serving_quantity?: unknown;
  nutriments?: Record<string, unknown>;
};

/** Pide un código a Open Food Facts. Un fallo de red se reintenta una vez. */
async function fetchOff(code: string): Promise<{ kind: 'found'; product: OffProduct } | { kind: 'missing' } | { kind: 'error' }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OFF_ENDPOINT}/${code}.json?fields=${OFF_FIELDS}`, {
        headers: {
          'User-Agent': 'FORZA AI/0.1 (barcode nutrition lookup)',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      });
      if (res.status === 404) return { kind: 'missing' };
      if (!res.ok) continue;
      const json = (await res.json()) as { status?: number; product?: OffProduct };
      if (json.status !== 1 || !json.product) return { kind: 'missing' };
      return { kind: 'found', product: json.product };
    } catch {
      // reintenta
    }
  }
  return { kind: 'error' };
}

/**
 * Busca un alimento por código de barras. Primero en la biblioteca local
 * (`food.external_id`); si no está, consulta Open Food Facts (probando las variantes del código:
 * UPC-A con cero adelante, GTIN-14) y, si el producto trae información nutricional, lo guarda en
 * `food` (`source: 'API'`) para reusarlo después. Los datos incompletos se reconstruyen: kcal desde
 * los macros, valores por 100 g desde los de la porción.
 */
export async function lookupBarcode(userId: string, barcode: string): Promise<BarcodeLookup> {
  const code = barcode.trim();
  if (!/^\d{8,14}$/.test(code)) return { status: 'not_found' };
  const candidates = candidateCodes(code);

  const existing = await prisma.food.findFirst({ where: { externalId: { in: candidates } } });
  if (existing) return { status: 'ok', food: toResult(existing) };

  let sawError = false;
  let partialName: string | null = null;
  for (const candidate of candidates) {
    const off = await fetchOff(candidate);
    if (off.kind === 'error') {
      sawError = true;
      continue;
    }
    if (off.kind === 'missing') continue;

    const p = off.product;
    const name = firstString(
      p.product_name_es,
      p.product_name,
      p.product_name_en,
      p.generic_name_es,
      p.generic_name,
      p.abbreviated_product_name,
    );
    const servingRaw = toNumber(p.serving_quantity);
    const servingQty = servingRaw !== null && servingRaw > 0 && servingRaw <= 5000 ? servingRaw : null;
    const macros = parseOffMacros(p.nutriments ?? {}, servingQty);
    if (!macros || !name) {
      partialName = partialName ?? name;
      continue;
    }

    const brand = firstString(p.brands?.split(',')[0]);
    try {
      const created = await prisma.food.create({
        data: {
          name: name.slice(0, 120),
          brand: brand ? brand.slice(0, 80) : null,
          source: 'API',
          externalId: code,
          verified: false,
          kcalPer100: macros.kcalPer100,
          proteinPer100: macros.proteinPer100,
          carbsPer100: macros.carbsPer100,
          fatPer100: macros.fatPer100,
          servingQty,
          servingUnit: servingQty ? 'g' : null,
          servingLabel: servingQty ? `${servingQty} g` : null,
        },
      });
      return { status: 'ok', food: toResult(created) };
    } catch {
      // Otra request creó la fila en paralelo (índice único): la releemos.
      const row = await prisma.food.findUnique({ where: { externalId: code } });
      if (row) return { status: 'ok', food: toResult(row) };
      return { status: 'error' };
    }
  }

  // Existe en OFF pero sin datos usables: se devuelve el nombre para precargar la carga manual.
  if (partialName) return { status: 'no_nutriments', name: partialName };
  return sawError ? { status: 'error' } : { status: 'not_found' };
}
