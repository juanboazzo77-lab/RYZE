/**
 * Plata de los cobros a gimnasios. Cada gimnasio paga en su moneda: pesos argentinos (ARS, lo normal) o dólares
 * (USD, para gimnasios de afuera). Los totales nunca mezclan monedas: se llevan por separado.
 */

export type Currency = 'ARS' | 'USD';
export const CURRENCIES: Currency[] = ['ARS', 'USD'];
export const asCurrency = (v: string | null | undefined): Currency => (v === 'USD' ? 'USD' : 'ARS');

/** Precio por socio y por mes para un gimnasio de Argentina (en pesos). */
export const DEFAULT_PRICE_ARS = 5000;

const num = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** $5.000 (pesos) o US$ 1,5 (dólares). */
export function formatMoney(n: number, currency: Currency): string {
  return currency === 'USD' ? `US$ ${num(n)}` : `$${num(n)}`;
}

export type Money = Record<Currency, number>;
export const zeroMoney = (): Money => ({ ARS: 0, USD: 0 });

/** "$40.000 · US$ 3": solo las monedas que tienen plata; si no hay nada, "$0". */
export function formatMoneyMap(m: Money): string {
  const parts = CURRENCIES.filter((c) => m[c] !== 0).map((c) => formatMoney(m[c], c));
  return parts.length > 0 ? parts.join(' · ') : '$0';
}

export const priceLimit = (currency: Currency): number => (currency === 'USD' ? 1000 : 1_000_000);
