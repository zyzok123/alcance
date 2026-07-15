import { db, type Transaction } from "@/db/schema";
import { inicioMes } from "@/lib/dates";

export interface ResumenHormigas {
  cantidad: number;
  totalUsdCentavos: number;
  transacciones: Transaction[];
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

  return {
    cantidad: hormigas.length,
    totalUsdCentavos: hormigas.reduce((s, t) => s + t.monto_usd_centavos, 0),
    transacciones: hormigas,
  };
}
