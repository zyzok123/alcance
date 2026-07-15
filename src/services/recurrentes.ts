import { db, type RecurringTransaction, type Transaction } from "@/db/schema";
import { vesToUsdCentavos, type Moneda } from "@/lib/money";
import { ahoraISO } from "@/lib/dates";
import { getTasaVigente } from "@/services/tasas";

export interface NuevoRecurrente {
  descripcion: string;
  monto_centavos: number;
  moneda: Moneda;
  categoria_id: number | null;
  cuenta_id: number | null;
  frecuencia: "mensual" | "quincenal" | "semanal";
  dia_del_periodo: number;
}

export async function crearRecurrente(r: NuevoRecurrente): Promise<number> {
  const id = await db.recurring_transactions.add({
    ...r,
    activa: true,
    ultima_generada: null,
  });
  return id!;
}

export async function recurrentesActivos(): Promise<RecurringTransaction[]> {
  return (await db.recurring_transactions.toArray()).filter((r) => r.activa);
}

export async function toggleActivaRecurrente(id: number, activa: boolean): Promise<void> {
  await db.recurring_transactions.update(id, { activa });
}

function diasEntre(desde: string, hasta: string): number {
  const [y1, m1, d1] = desde.split("-").map(Number);
  const [y2, m2, d2] = hasta.split("-").map(Number);
  const ms1 = new Date(y1 ?? 1970, (m1 ?? 1) - 1, d1 ?? 1).getTime();
  const ms2 = new Date(y2 ?? 1970, (m2 ?? 1) - 1, d2 ?? 1).getTime();
  return Math.round((ms2 - ms1) / 86_400_000);
}

/**
 * ¿Toca generar hoy? mensual: día-del-mes alcanzado y no generado este mes.
 * semanal: hoy es ese día de la semana (0=domingo) y no generado hoy.
 * quincenal: pasaron >=15 días desde la última generación (o nunca se generó).
 */
function esDebido(r: RecurringTransaction, hoy: string): boolean {
  if (r.ultima_generada === hoy) return false;

  if (r.frecuencia === "mensual") {
    const diaHoy = Number(hoy.slice(8, 10));
    const mesHoy = hoy.slice(0, 7);
    const mesUltima = r.ultima_generada ? r.ultima_generada.slice(0, 7) : null;
    return diaHoy >= r.dia_del_periodo && mesUltima !== mesHoy;
  }

  if (r.frecuencia === "semanal") {
    const [y, m, d] = hoy.split("-").map(Number);
    const diaSemana = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getDay();
    return diaSemana === r.dia_del_periodo;
  }

  if (r.frecuencia === "quincenal") {
    if (!r.ultima_generada) return true;
    return diasEntre(r.ultima_generada, hoy) >= 15;
  }

  return false;
}

async function generarTransaccion(r: RecurringTransaction): Promise<void> {
  const categorias = await db.categories.toArray();
  const cat = r.categoria_id !== null ? categorias.find((c) => c.id === r.categoria_id) : undefined;
  const esIngreso = cat?.tipo === "ingreso";
  const esGasto = cat?.tipo === "gasto";

  const { tasaX10000: tasa, fuente } = await getTasaVigente();
  const esUsd = r.moneda !== "VES";
  const montoUsd = esUsd ? r.monto_centavos : vesToUsdCentavos(r.monto_centavos, tasa);

  const settings = await db.settings.get(1);
  const umbral = settings?.umbral_hormiga_usd_centavos ?? 300;

  const tx: Transaction = {
    monto_centavos: r.monto_centavos,
    moneda: r.moneda,
    tasa_cambio_al_momento_x10000: esUsd ? null : tasa || null,
    fuente_tasa: esUsd ? null : fuente,
    monto_usd_centavos: montoUsd,
    cuenta_origen_id: esIngreso ? null : r.cuenta_id,
    cuenta_destino_id: esIngreso ? r.cuenta_id : null,
    categoria_id: r.categoria_id,
    es_hormiga: esGasto && montoUsd > 0 && montoUsd < umbral,
    fecha: ahoraISO(),
    nota: `Recurrente: ${r.descripcion}`,
    recurrente_id: r.id ?? null,
  };
  await db.transactions.add(tx);
}

/**
 * Revisa todos los recurrentes activos y genera los que tocan hoy.
 * Todo corre dentro de una única transacción Dexie: si esta función se
 * invoca dos veces casi al mismo tiempo (p. ej. React StrictMode en dev,
 * o dos pestañas abiertas), IndexedDB serializa ambas transacciones —
 * la segunda ve el `ultima_generada` ya actualizado por la primera y no
 * duplica la transacción generada.
 */
export async function generarPendientes(hoy: string): Promise<number> {
  return db.transaction(
    "rw",
    [db.recurring_transactions, db.transactions, db.categories, db.settings, db.exchange_rates_cache],
    async () => {
      const activos = await recurrentesActivos();
      let generados = 0;
      for (const r of activos) {
        if (!esDebido(r, hoy)) continue;
        await generarTransaccion(r);
        await db.recurring_transactions.update(r.id!, { ultima_generada: hoy });
        generados++;
      }
      return generados;
    },
  );
}
