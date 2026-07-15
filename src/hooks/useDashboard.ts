import { useLiveQuery } from "dexie-react-hooks";
import { db, type Category, type Transaction } from "@/db/schema";
import { hoyISO } from "@/lib/dates";
import {
  calcularEstadoSobre,
  gastosDelSobre,
  sobreActivo,
  type EstadoSobre,
} from "@/services/envelopes";
import { hormigasDelMes, type ResumenHormigas } from "@/services/hormigas";
import { calcularRachaPresupuesto } from "@/services/rachas";

export interface DatosDashboard {
  estado: EstadoSobre | null; // null = no hay sobre activo
  hormigas: ResumenHormigas;
  ultimas: Transaction[];
  categorias: Map<number, Category>;
  racha: number;
  hoy: string;
}

/** Consulta viva: se recalcula sola ante cualquier cambio en la BD. */
export function useDashboard(): DatosDashboard | undefined {
  return useLiveQuery(async () => {
    const hoy = hoyISO();

    const sobre = await sobreActivo(hoy);
    const estado = sobre
      ? calcularEstadoSobre(sobre, await gastosDelSobre(sobre), hoy)
      : null;

    const hormigas = await hormigasDelMes(hoy);
    const racha = await calcularRachaPresupuesto(hoy);

    const ultimas = await db.transactions
      .orderBy("fecha")
      .reverse()
      .limit(5)
      .toArray();

    const categorias = new Map<number, Category>(
      (await db.categories.toArray()).map((c) => [c.id as number, c]),
    );

    return { estado, hormigas, ultimas, categorias, racha, hoy };
  }, []);
}
