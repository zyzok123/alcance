import { db, type Transaction } from "@/db/schema";
import { vesToUsdCentavos, type Moneda } from "@/lib/money";
import { ahoraISO } from "@/lib/dates";

export interface NuevoGasto {
  monto_centavos: number;
  moneda: Moneda;
  categoria_id: number;
  cuenta_id: number | null;
  nota?: string;
}

/**
 * Crea un gasto simple. Congela la tasa del momento, calcula el equivalente
 * USD y auto-marca como hormiga si queda bajo el umbral configurado.
 */
export async function registrarGasto(gasto: NuevoGasto): Promise<Transaction> {
  const settings = await db.settings.get(1);
  const umbral = settings?.umbral_hormiga_usd_centavos ?? 300;
  const tasa = settings?.tasa_manual_x10000 ?? 0;

  const esUsd = gasto.moneda !== "VES";
  const montoUsd = esUsd
    ? gasto.monto_centavos
    : vesToUsdCentavos(gasto.monto_centavos, tasa);

  const tx: Transaction = {
    monto_centavos: gasto.monto_centavos,
    moneda: gasto.moneda,
    tasa_cambio_al_momento_x10000: esUsd ? null : tasa || null,
    fuente_tasa: esUsd ? null : tasa > 0 ? "manual" : null,
    monto_usd_centavos: montoUsd,
    cuenta_origen_id: gasto.cuenta_id,
    cuenta_destino_id: null,
    categoria_id: gasto.categoria_id,
    es_hormiga: montoUsd > 0 && montoUsd < umbral,
    fecha: ahoraISO(),
    nota: gasto.nota ?? "",
    recurrente_id: null,
  };

  const id = await db.transactions.add(tx);
  return { ...tx, id: id! };
}

/** Último gasto registrado (para el botón "repetir último"). */
export async function ultimoGasto(): Promise<Transaction | undefined> {
  const ultimas = await db.transactions.orderBy("fecha").reverse().limit(10).toArray();
  return ultimas.find((t) => t.cuenta_destino_id === null && t.categoria_id !== null);
}

/** Repite el último gasto con fecha de ahora. */
export async function repetirUltimoGasto(): Promise<Transaction | null> {
  const anterior = await ultimoGasto();
  if (!anterior || anterior.categoria_id === null) return null;
  return registrarGasto({
    monto_centavos: anterior.monto_centavos,
    moneda: anterior.moneda,
    categoria_id: anterior.categoria_id,
    cuenta_id: anterior.cuenta_origen_id,
    nota: anterior.nota,
  });
}
