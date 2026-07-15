import { db, type Transaction, type WeeklyEnvelope } from "@/db/schema";
import { diasRestantes } from "@/lib/dates";

/** Sobre activo: aquel cuyo rango [inicio, fin] contiene el día `hoy`. */
export async function sobreActivo(hoy: string): Promise<WeeklyEnvelope | undefined> {
  const candidatos = await db.weekly_envelopes
    .where("fecha_inicio")
    .belowOrEqual(hoy)
    .toArray();
  return candidatos
    .filter((s) => s.fecha_fin >= hoy)
    .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio))[0];
}

/** Crea un sobre semanal manual (Fase 1: sin payday plan). */
export async function crearSobreManual(params: {
  monto_asignado_usd_centavos: number;
  fecha_inicio: string;
  fecha_fin: string;
}): Promise<number> {
  const id = await db.weekly_envelopes.add({
    payday_plan_id: null,
    semana_numero: 1,
    ...params,
  });
  return id!;
}

/** Transacciones de gasto dentro del rango de un sobre. */
export async function gastosDelSobre(sobre: WeeklyEnvelope): Promise<Transaction[]> {
  const txs = await db.transactions
    .where("fecha")
    .between(sobre.fecha_inicio, `${sobre.fecha_fin}￿`, true, true)
    .toArray();

  const categorias = await db.categories.toArray();
  const idsGasto = new Set(
    categorias.filter((c) => c.tipo === "gasto").map((c) => c.id),
  );
  return txs.filter(
    (t) => t.cuenta_destino_id === null && t.categoria_id !== null && idsGasto.has(t.categoria_id),
  );
}

export interface EstadoSobre {
  sobre: WeeklyEnvelope;
  gastadoUsdCentavos: number;
  gastadoHoyUsdCentavos: number;
  diasRestantes: number;
  /** El número héroe: (asignado - gastado) / días restantes. Puede ser negativo. */
  presupuestoHoyUsdCentavos: number;
  /** Presupuesto con el que arrancó el día (para el % del gauge). */
  presupuestoInicialHoyUsdCentavos: number;
  /** 0..1: fracción del presupuesto de hoy ya consumida. */
  fraccionConsumidaHoy: number;
  /** 0..1: fracción del sobre ya consumida (barra de progreso). */
  fraccionSobre: number;
  /** Si hoy quedó en negativo: cuánto sería el día de mañana. */
  presupuestoMananaUsdCentavos: number | null;
}

/** Cálculo central del dashboard. Todo en centavos USD enteros. */
export function calcularEstadoSobre(
  sobre: WeeklyEnvelope,
  gastos: Transaction[],
  hoy: string,
): EstadoSobre {
  const gastado = gastos.reduce((sum, t) => sum + t.monto_usd_centavos, 0);
  const gastadoHoy = gastos
    .filter((t) => t.fecha.slice(0, 10) === hoy)
    .reduce((sum, t) => sum + t.monto_usd_centavos, 0);

  const dias = diasRestantes(hoy, sobre.fecha_fin);
  const asignado = sobre.monto_asignado_usd_centavos;

  const presupuestoHoy = Math.floor((asignado - gastado) / dias);
  const presupuestoInicialHoy = Math.max(
    0,
    Math.floor((asignado - (gastado - gastadoHoy)) / dias),
  );

  const fraccionConsumidaHoy =
    presupuestoInicialHoy <= 0
      ? 1
      : Math.min(1, gastadoHoy / presupuestoInicialHoy);

  const fraccionSobre = asignado <= 0 ? 1 : Math.min(1, gastado / asignado);

  const presupuestoManana =
    presupuestoHoy < 0 && dias > 1
      ? Math.floor((asignado - gastado) / (dias - 1))
      : null;

  return {
    sobre,
    gastadoUsdCentavos: gastado,
    gastadoHoyUsdCentavos: gastadoHoy,
    diasRestantes: dias,
    presupuestoHoyUsdCentavos: presupuestoHoy,
    presupuestoInicialHoyUsdCentavos: presupuestoInicialHoy,
    fraccionConsumidaHoy,
    fraccionSobre,
    presupuestoMananaUsdCentavos: presupuestoManana,
  };
}
