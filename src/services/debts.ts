import { db, type Debt, type Transaction } from "@/db/schema";
import { vesToUsdCentavos, type Moneda } from "@/lib/money";
import { ahoraISO } from "@/lib/dates";
import { getTasaVigente } from "@/services/tasas";

export interface NuevaDeuda {
  descripcion: string;
  acreedor: string;
  monto_centavos: number;
  moneda: Moneda;
  fecha_limite: string | null;
}

export async function crearDeuda(deuda: NuevaDeuda): Promise<number> {
  const id = await db.debts.add({
    ...deuda,
    estado: "pendiente",
    transaction_id: null,
  });
  return id!;
}

export async function deudasPendientes(): Promise<Debt[]> {
  return db.debts.where("estado").equals("pendiente").toArray();
}

export async function deudasPagadas(): Promise<Debt[]> {
  return db.debts.where("estado").equals("pagada").toArray();
}

async function categoriaPagoDeuda(): Promise<number> {
  const cats = await db.categories.toArray();
  const cat = cats.find((c) => c.nombre === "Pago de deuda");
  if (!cat?.id) throw new Error("Categoría 'Pago de deuda' no existe");
  return cat.id;
}

/**
 * Marca una deuda como pagada: crea la transacción (tipo transferencia, no
 * cuenta hacia gasto hormiga ni sobre semanal) y enlaza transaction_id.
 */
export async function pagarDeuda(
  deudaId: number,
  cuentaOrigenId: number | null,
): Promise<Transaction> {
  const deuda = await db.debts.get(deudaId);
  if (!deuda) throw new Error("Deuda no encontrada");

  const { tasaX10000: tasa, fuente } = await getTasaVigente();
  const esUsd = deuda.moneda !== "VES";
  const montoUsd = esUsd
    ? deuda.monto_centavos
    : vesToUsdCentavos(deuda.monto_centavos, tasa);

  const tx: Transaction = {
    monto_centavos: deuda.monto_centavos,
    moneda: deuda.moneda,
    tasa_cambio_al_momento_x10000: esUsd ? null : tasa || null,
    fuente_tasa: esUsd ? null : fuente,
    monto_usd_centavos: montoUsd,
    cuenta_origen_id: cuentaOrigenId,
    cuenta_destino_id: null,
    categoria_id: await categoriaPagoDeuda(),
    es_hormiga: false,
    fecha: ahoraISO(),
    nota: `Pago: ${deuda.descripcion} (${deuda.acreedor})`,
    recurrente_id: null,
  };

  const txId = await db.transactions.add(tx);
  await db.debts.update(deudaId, { estado: "pagada", transaction_id: txId! });
  return { ...tx, id: txId! };
}
