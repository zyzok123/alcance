import { db, type Account } from "@/db/schema";
import { vesToUsdCentavos } from "@/lib/money";
import { getTasaVigente } from "@/services/tasas";

export interface CuentaConUsd {
  cuenta: Account;
  usdCentavos: number;
}

export interface Patrimonio {
  porCuenta: CuentaConUsd[];
  brutoUsdCentavos: number;
  deudasUsdCentavos: number;
  netoUsdCentavos: number;
}

/** Convierte a USD: VES usa la tasa vigente, USD/USDT van 1:1. */
function aUsd(moneda: string, centavos: number, tasaX10000: number): number {
  return moneda === "VES" ? vesToUsdCentavos(centavos, tasaX10000) : centavos;
}

/**
 * Patrimonio neto = suma de balances de cuentas activas (a USD) menos
 * deudas pendientes (a USD). Balances son manuales (ver services/accounts).
 */
export async function calcularPatrimonio(): Promise<Patrimonio> {
  const { tasaX10000: tasa } = await getTasaVigente();

  const cuentas = (await db.accounts.toArray()).filter((a) => a.activa);
  const porCuenta = cuentas.map((cuenta) => ({
    cuenta,
    usdCentavos: aUsd(cuenta.moneda, cuenta.balance_actual_centavos, tasa),
  }));
  const brutoUsdCentavos = porCuenta.reduce((sum, c) => sum + c.usdCentavos, 0);

  const deudas = await db.debts.where("estado").equals("pendiente").toArray();
  const deudasUsdCentavos = deudas.reduce(
    (sum, d) => sum + aUsd(d.moneda, d.monto_centavos, tasa),
    0,
  );

  return {
    porCuenta,
    brutoUsdCentavos,
    deudasUsdCentavos,
    netoUsdCentavos: brutoUsdCentavos - deudasUsdCentavos,
  };
}
