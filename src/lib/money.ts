/**
 * Utilidades de dinero centralizadas.
 *
 * REGLA INNEGOCIABLE: todos los montos se almacenan y operan como ENTEROS
 * en unidades menores (centavos). Las tasas de cambio se almacenan como
 * enteros escalados por 10 000 (RATE_SCALE), p. ej. 1 USD = Bs 36,5012
 * → tasa_x10000 = 365012. Ningún otro módulo hace aritmética monetaria.
 */

export const RATE_SCALE = 10_000;

export type Moneda = "VES" | "USD" | "USDT";

/** Parsea entrada de usuario ("12,50" | "12.50" | "1250") a centavos. */
export function parseToCentavos(input: string): number {
  const limpio = input.replace(/\s/g, "").replace(",", ".");
  if (limpio === "" || limpio === ".") return 0;
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor * 100);
}

/** Parsea una tasa escrita por el usuario ("36,50") a entero x10000. */
export function parseTasaX10000(input: string): number {
  const limpio = input.replace(/\s/g, "").replace(",", ".");
  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor * RATE_SCALE);
}

/** Convierte centavos de Bs a centavos de USD según tasa (Bs por USD, x10000). */
export function vesToUsdCentavos(vesCentavos: number, tasaX10000: number): number {
  if (tasaX10000 <= 0) return 0;
  return Math.round((vesCentavos * RATE_SCALE) / tasaX10000);
}

/** Convierte centavos de USD a centavos de Bs según tasa (Bs por USD, x10000). */
export function usdToVesCentavos(usdCentavos: number, tasaX10000: number): number {
  if (tasaX10000 <= 0) return 0;
  return Math.round((usdCentavos * tasaX10000) / RATE_SCALE);
}

const nfDecimales = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nfEntero = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formatea centavos como número con formato es-VE: 1234550 → "12.345,50". */
export function formatCentavos(centavos: number): string {
  return nfDecimales.format(centavos / 100);
}

/** Formatea centavos sin decimales: 1234550 → "12.346". */
export function formatCentavosEntero(centavos: number): string {
  return nfEntero.format(Math.round(centavos / 100));
}

/** Formatea con símbolo según moneda: "$ 12,50" | "Bs 1.250,00". */
export function formatMonto(centavos: number, moneda: Moneda): string {
  const simbolo = moneda === "VES" ? "Bs" : "$";
  return `${simbolo} ${formatCentavos(centavos)}`;
}

/** Formatea una tasa x10000 para mostrar: 365012 → "36,50". */
export function formatTasa(tasaX10000: number): string {
  return nfDecimales.format(tasaX10000 / RATE_SCALE);
}
