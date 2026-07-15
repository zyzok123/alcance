import { db, type Transaction } from "@/db/schema";
import { diasEnMes, inicioMes } from "@/lib/dates";

export interface ResumenHormigas {
  cantidad: number;
  totalUsdCentavos: number;
  transacciones: Transaction[];
  /** Extrapolación del ritmo actual a los días totales del mes. */
  proyeccionMesUsdCentavos: number;
}

/** Gastos hormiga del mes de la fecha dada (default: mes en curso). */
export async function hormigasDelMes(hoy: string): Promise<ResumenHormigas> {
  const desde = inicioMes(hoy);
  const txs = await db.transactions
    .where("fecha")
    .between(desde, `${hoy}￿`, true, true)
    .toArray();

  const hormigas = txs
    .filter((t) => t.es_hormiga)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const totalUsdCentavos = hormigas.reduce((s, t) => s + t.monto_usd_centavos, 0);
  const diaActual = Number(hoy.slice(8, 10));
  const diasTotales = diasEnMes(hoy);
  const proyeccionMesUsdCentavos =
    diaActual > 0 ? Math.round((totalUsdCentavos / diaActual) * diasTotales) : 0;

  return {
    cantidad: hormigas.length,
    totalUsdCentavos,
    transacciones: hormigas,
    proyeccionMesUsdCentavos,
  };
}
