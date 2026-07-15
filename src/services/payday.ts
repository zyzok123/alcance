import { db, type Transaction } from "@/db/schema";
import { vesToUsdCentavos, type Moneda } from "@/lib/money";
import { addDias, ahoraISO } from "@/lib/dates";
import { pagarDeuda } from "@/services/debts";
import { getTasaVigente } from "@/services/tasas";

function fechaAMs(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

/** Próxima fecha de cobro estrictamente posterior a `desde`, según días del mes configurados. */
export function proximaFechaCobro(desde: string, diasDelMes: number[]): string | null {
  if (diasDelMes.length === 0) return null;
  const [y, m, d] = desde.split("-").map(Number);
  const base = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const candidatas: Date[] = [];
  for (const dia of diasDelMes) {
    // mismo mes y mes siguiente: cubre el caso donde el día ya pasó.
    candidatas.push(new Date(base.getFullYear(), base.getMonth(), dia));
    candidatas.push(new Date(base.getFullYear(), base.getMonth() + 1, dia));
  }
  const futuras = candidatas.filter((c) => c.getTime() > base.getTime());
  if (futuras.length === 0) return null;
  const min = futuras.reduce((a, b) => (a.getTime() < b.getTime() ? a : b));
  return `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, "0")}-${String(
    min.getDate(),
  ).padStart(2, "0")}`;
}

/** Sugiere num_semanas a partir de la brecha hasta el próximo cobro configurado. */
export function sugerirNumSemanas(fechaCobro: string, diasDelMes: number[]): number {
  const proxima = proximaFechaCobro(fechaCobro, diasDelMes);
  if (!proxima) return 2;
  const dias = Math.round((fechaAMs(proxima) - fechaAMs(fechaCobro)) / 86_400_000);
  return Math.max(1, Math.round(dias / 7));
}

export interface NuevoPaydayPlan {
  fecha_cobro: string;
  monto_total_centavos: number;
  moneda_cobro: Moneda;
  deudaIds: number[];
  monto_protegido_centavos: number;
  num_semanas: number;
  /** Cuenta por la que entra el cobro y de la que salen los pagos de deuda. null = no registrar movimientos de cuenta. */
  cuenta_id: number | null;
  notas?: string;
}

/**
 * Crea el plan de cobro completo: paga deudas seleccionadas, registra el
 * ingreso (si hay cuenta) y reparte lo que sobra en N sobres semanales.
 */
export async function crearPaydayPlan(plan: NuevoPaydayPlan): Promise<number> {
  const { tasaX10000: tasa, fuente } = await getTasaVigente();

  const esUsd = plan.moneda_cobro !== "VES";
  const montoUsd = esUsd
    ? plan.monto_total_centavos
    : vesToUsdCentavos(plan.monto_total_centavos, tasa);

  let totalDeudasUsd = 0;
  for (const deudaId of plan.deudaIds) {
    const deuda = await db.debts.get(deudaId);
    if (!deuda) continue;
    totalDeudasUsd +=
      deuda.moneda !== "VES"
        ? deuda.monto_centavos
        : vesToUsdCentavos(deuda.monto_centavos, tasa);
  }

  const montoParaVivir = Math.max(
    0,
    montoUsd - totalDeudasUsd - plan.monto_protegido_centavos,
  );

  const planId = await db.payday_plans.add({
    fecha_cobro: plan.fecha_cobro,
    monto_total_centavos: plan.monto_total_centavos,
    moneda_cobro: plan.moneda_cobro,
    monto_usd_centavos: montoUsd,
    total_deudas_pagadas_centavos: totalDeudasUsd,
    monto_protegido_centavos: plan.monto_protegido_centavos,
    monto_para_vivir_centavos: montoParaVivir,
    num_semanas: plan.num_semanas,
    notas: plan.notas ?? "",
  });

  // Sobres semanales: reparto entero, el resto de centavos va al último.
  const semanas = Math.max(1, plan.num_semanas);
  const base = Math.floor(montoParaVivir / semanas);
  const resto = montoParaVivir - base * semanas;
  let inicio = plan.fecha_cobro;
  for (let i = 0; i < semanas; i++) {
    const fin = addDias(inicio, 6);
    await db.weekly_envelopes.add({
      payday_plan_id: planId!,
      semana_numero: i + 1,
      fecha_inicio: inicio,
      fecha_fin: fin,
      monto_asignado_usd_centavos: base + (i === semanas - 1 ? resto : 0),
    });
    inicio = addDias(fin, 1);
  }

  for (const deudaId of plan.deudaIds) {
    await pagarDeuda(deudaId, plan.cuenta_id);
  }

  if (plan.monto_total_centavos > 0 && plan.cuenta_id !== null) {
    const cats = await db.categories.toArray();
    const catSueldo = cats.find((c) => c.nombre === "Sueldo");
    const tx: Transaction = {
      monto_centavos: plan.monto_total_centavos,
      moneda: plan.moneda_cobro,
      tasa_cambio_al_momento_x10000: esUsd ? null : tasa || null,
      fuente_tasa: esUsd ? null : fuente,
      monto_usd_centavos: montoUsd,
      cuenta_origen_id: null,
      cuenta_destino_id: plan.cuenta_id,
      categoria_id: catSueldo?.id ?? null,
      es_hormiga: false,
      fecha: ahoraISO(),
      nota: "Cobro registrado vía asistente de pago",
      recurrente_id: null,
    };
    await db.transactions.add(tx);
  }

  return planId!;
}
