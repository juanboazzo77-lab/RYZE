import 'server-only';
import { prisma } from '@/server/db';

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
        WHERE (source = 'SYSTEM' OR created_by = ${userId}::uuid)
          AND (
            unaccent(name) ILIKE unaccent(${'%' + q + '%'})
            OR similarity(unaccent(name), unaccent(${q})) > 0.2
          )
        ORDER BY
          (unaccent(name) ILIKE unaccent(${q + '%'})) DESC,
          similarity(unaccent(name), unaccent(${q})) DESC,
          verified DESC,
          name ASC
        LIMIT ${limit}
      `;
      return rows.map((r) => ({
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
  'code,product_name,product_name_es,generic_name,generic_name_es,abbreviated_product_name,brands,serving_quantity,nutriments';

const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), max);

function firstString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

interface OffNutriments {
  'energy-kcal_100g'?: unknown;
  energy_100g?: unknown;
  proteins_100g?: unknown;
  carbohydrates_100g?: unknown;
  fat_100g?: unknown;
}

/** Extrae macros por 100 g de la respuesta de OFF. `null` si no hay energía usable. */
function parseOffMacros(n: OffNutriments): {
  kcalPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
} | null {
  const kcalDirect = toNumber(n['energy-kcal_100g']);
  const energyKj = toNumber(n.energy_100g);
  const kcal = kcalDirect ?? (energyKj !== null ? energyKj / 4.184 : null);
  if (kcal === null || kcal <= 0) return null;
  return {
    kcalPer100: Math.round(clamp(kcal, 1000)),
    proteinPer100: Math.round(clamp(toNumber(n.proteins_100g) ?? 0, 1000) * 10) / 10,
    carbsPer100: Math.round(clamp(toNumber(n.carbohydrates_100g) ?? 0, 1000) * 10) / 10,
    fatPer100: Math.round(clamp(toNumber(n.fat_100g) ?? 0, 1000) * 10) / 10,
  };
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
export async function lookupBarcode(userId: string, barcode: string): Promise<BarcodeLookup> {
  const code = barcode.trim();
  if (!/^\d{8,14}$/.test(code)) return { status: 'not_found' };

  const existing = await prisma.food.findUnique({ where: { externalId: code } });
  if (existing) return { status: 'ok', food: toResult(existing) };

  let json: {
    status?: number;
    product?: {
      product_name?: string;
      product_name_es?: string;
      generic_name?: string;
      generic_name_es?: string;
      abbreviated_product_name?: string;
      brands?: string;
      serving_quantity?: unknown;
      nutriments?: OffNutriments;
    };
  };
  try {
    const res = await fetch(`${OFF_ENDPOINT}/${code}.json?fields=${OFF_FIELDS}`, {
      headers: {
        'User-Agent': 'GYMO/0.1 (barcode nutrition lookup)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'error' };
    json = await res.json();
  } catch {
    return { status: 'error' };
  }

  if (json.status !== 1 || !json.product) return { status: 'not_found' };

  const p = json.product;
  const name = firstString(
    p.product_name_es,
    p.product_name,
    p.generic_name_es,
    p.generic_name,
    p.abbreviated_product_name,
  );
  const macros = parseOffMacros(p.nutriments ?? {});
  if (!macros) return { status: 'no_nutriments', name };
  if (!name) return { status: 'no_nutriments', name: null };

  const brand = firstString(p.brands?.split(',')[0]);
  const servingRaw = toNumber(p.serving_quantity);
  const servingQty = servingRaw !== null && servingRaw > 0 && servingRaw <= 5000 ? servingRaw : null;

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
