import { db, type Transaction } from "@/db/schema";
import { diasEnMes, inicioMes } from "@/lib/dates";

export interface GastoCategoria {
  nombre: string;
  color: string;
  totalUsdCentavos: number;
}

export interface GastoDia {
  dia: number;
  totalUsdCentavos: number;
  hormigaUsdCentavos: number;
}

/** Transacciones de gasto (no transferencia/ingreso) del mes de `hoy`. */
async function gastosDelMes(hoy: string): Promise<Transaction[]> {
  const desde = inicioMes(hoy);
  const txs = await db.transactions
    .where("fecha")
    .between(desde, `${hoy}￿`, true, true)
    .toArray();

  const categorias = await db.categories.toArray();
  const idsGasto = new Set(
    categorias.filter((c) => c.tipo === "gasto").map((c) => c.id),
  );
  return txs.filter(
    (t) => t.cuenta_destino_id === null && t.categoria_id !== null && idsGasto.has(t.categoria_id),
  );
}

/** Total gastado por categoría en el mes, de mayor a menor. */
export async function gastoPorCategoriaDelMes(hoy: string): Promise<GastoCategoria[]> {
  const gastos = await gastosDelMes(hoy);
  const categorias = await db.categories.toArray();
  const catMap = new Map(categorias.map((c) => [c.id as number, c]));

  const totales = new Map<number, number>();
  for (const t of gastos) {
    if (t.categoria_id === null) continue;
    totales.set(t.categoria_id, (totales.get(t.categoria_id) ?? 0) + t.monto_usd_centavos);
  }

  return Array.from(totales.entries())
    .map(([catId, total]) => {
      const cat = catMap.get(catId);
      return { nombre: cat?.nombre ?? "—", color: cat?.color ?? "primario", totalUsdCentavos: total };
    })
    .sort((a, b) => b.totalUsdCentavos - a.totalUsdCentavos);
}

/** Gasto total y gasto hormiga por día del mes (todos los días, incluso en 0). */
export async function gastoPorDiaDelMes(hoy: string): Promise<GastoDia[]> {
  const gastos = await gastosDelMes(hoy);
  const totalDias = diasEnMes(hoy);

  const porDia = new Map<number, { total: number; hormiga: number }>();
  for (const t of gastos) {
    const dia = Number(t.fecha.slice(8, 10));
    const actual = porDia.get(dia) ?? { total: 0, hormiga: 0 };
    actual.total += t.monto_usd_centavos;
    if (t.es_hormiga) actual.hormiga += t.monto_usd_centavos;
    porDia.set(dia, actual);
  }

  return Array.from({ length: totalDias }, (_, i) => {
    const dia = i + 1;
    const datos = porDia.get(dia);
    return {
      dia,
      totalUsdCentavos: datos?.total ?? 0,
      hormigaUsdCentavos: datos?.hormiga ?? 0,
    };
  });
}
