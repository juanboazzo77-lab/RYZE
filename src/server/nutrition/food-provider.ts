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
          AND name ILIKE ${'%' + q + '%'}
        ORDER BY
          (name ILIKE ${q + '%'}) DESC,
          similarity(name, ${q}) DESC,
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
