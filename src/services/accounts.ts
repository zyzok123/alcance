import { db, type Account, type TipoCuenta, type Transaction } from "@/db/schema";
import { vesToUsdCentavos, type Moneda } from "@/lib/money";
import { ahoraISO } from "@/lib/dates";
import { getTasaVigente } from "@/services/tasas";

export interface NuevaCuenta {
  nombre: string;
  tipo: TipoCuenta;
  moneda: Moneda;
  balance_inicial_centavos: number;
}

export async function crearCuenta(cuenta: NuevaCuenta): Promise<number> {
  const id = await db.accounts.add({
    nombre: cuenta.nombre,
    tipo: cuenta.tipo,
    moneda: cuenta.moneda,
    balance_actual_centavos: cuenta.balance_inicial_centavos,
    activa: true,
  });
  return id!;
}

export async function cuentasActivas(): Promise<Account[]> {
  return (await db.accounts.toArray()).filter((a) => a.activa);
}

async function categoriaAjuste(): Promise<number> {
  const cats = await db.categories.toArray();
  const cat = cats.find((c) => c.nombre === "Ajuste de saldo");
  if (!cat?.id) throw new Error("Categoría 'Ajuste de saldo' no existe");
  return cat.id;
}

/**
 * Reconcilia el balance de una cuenta con lo que el usuario vio en su banco
 * o billetera. Si hay diferencia, deja un registro auditable (transacción
 * "Ajuste de saldo", tipo transferencia — no cuenta como gasto ni hormiga)
 * para poder rastrear después qué se dejó de cargar.
 */
export async function ajustarBalanceCuenta(
  cuentaId: number,
  nuevoBalanceCentavos: number,
): Promise<Transaction | null> {
  const cuenta = await db.accounts.get(cuentaId);
  if (!cuenta) throw new Error("Cuenta no encontrada");

  const delta = nuevoBalanceCentavos - cuenta.balance_actual_centavos;
  await db.accounts.update(cuentaId, { balance_actual_centavos: nuevoBalanceCentavos });
  if (delta === 0) return null;

  const { tasaX10000: tasa, fuente } = await getTasaVigente();
  const esUsd = cuenta.moneda !== "VES";
  const montoAbs = Math.abs(delta);
  const montoUsd = esUsd ? montoAbs : vesToUsdCentavos(montoAbs, tasa);

  const tx: Transaction = {
    monto_centavos: montoAbs,
    moneda: cuenta.moneda,
    tasa_cambio_al_momento_x10000: esUsd ? null : tasa || null,
    fuente_tasa: esUsd ? null : fuente,
    monto_usd_centavos: montoUsd,
    cuenta_origen_id: delta < 0 ? cuentaId : null,
    cuenta_destino_id: delta > 0 ? cuentaId : null,
    categoria_id: await categoriaAjuste(),
    es_hormiga: false,
    fecha: ahoraISO(),
    nota: `Ajuste de saldo: ${cuenta.nombre}`,
    recurrente_id: null,
  };

  const txId = await db.transactions.add(tx);
  return { ...tx, id: txId! };
}
