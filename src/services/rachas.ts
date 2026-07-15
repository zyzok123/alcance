import { db } from "@/db/schema";
import { addDias } from "@/lib/dates";
import { calcularEstadoSobre } from "@/services/envelopes";

const TOPE_DIAS = 3650; // salvaguarda: nunca debería iterar años completos

/**
 * Racha = días consecutivos y completos (no cuenta hoy, aún en curso) en los
 * que el gasto del día no superó el presupuesto con el que arrancó ese día.
 * Se rompe si un día no tuvo sobre vigente o si se excedió el presupuesto.
 */
export async function calcularRachaPresupuesto(hoy: string): Promise<number> {
  const sobres = await db.weekly_envelopes.toArray();
  if (sobres.length === 0) return 0;

  const categorias = await db.categories.toArray();
  const idsGasto = new Set(
    categorias.filter((c) => c.tipo === "gasto").map((c) => c.id),
  );

  const gastos = (await db.transactions.toArray()).filter(
    (t) =>
      t.cuenta_destino_id === null &&
      t.categoria_id !== null &&
      idsGasto.has(t.categoria_id),
  );

  let racha = 0;
  let dia = addDias(hoy, -1);

  while (racha < TOPE_DIAS) {
    const sobre = sobres.find((s) => s.fecha_inicio <= dia && dia <= s.fecha_fin);
    if (!sobre) break;

    const gastosHastaDia = gastos.filter(
      (t) => t.fecha.slice(0, 10) >= sobre.fecha_inicio && t.fecha.slice(0, 10) <= dia,
    );
    const estado = calcularEstadoSobre(sobre, gastosHastaDia, dia);

    const seExcedio =
      estado.presupuestoInicialHoyUsdCentavos > 0
        ? estado.gastadoHoyUsdCentavos > estado.presupuestoInicialHoyUsdCentavos
        : estado.gastadoHoyUsdCentavos > 0;
    if (seExcedio) break;

    racha++;
    dia = addDias(dia, -1);
  }

  return racha;
}
