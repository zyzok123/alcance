import { db, type FuenteTasa } from "@/db/schema";
import { hoyISO } from "@/lib/dates";
import { RATE_SCALE } from "@/lib/money";

/**
 * DolarAPI (ve.dolarapi.com): "oficial" = BCV, "paralelo" = mercado calle,
 * que en la práctica es la misma cifra que Binance P2P en Venezuela (no
 * hay fuente separada de Binance: su API bloquea CORS sin proxy propio).
 */
const DOLARAPI_URL = "https://ve.dolarapi.com/v1/dolares";

interface TasasDolarApi {
  bcvX10000: number | null;
  paraleloX10000: number | null;
}

interface DolarApiEntry {
  fuente: string;
  promedio: number | null;
}

/** Trae tasas de DolarAPI. null si no hay internet o la respuesta es inválida. */
export async function fetchTasasDolarApi(): Promise<TasasDolarApi | null> {
  try {
    const res = await fetch(DOLARAPI_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as DolarApiEntry[];
    const oficial = data.find((d) => d.fuente === "oficial");
    const paralelo = data.find((d) => d.fuente === "paralelo");
    const bcvX10000 =
      oficial?.promedio && oficial.promedio > 0
        ? Math.round(oficial.promedio * RATE_SCALE)
        : null;
    const paraleloX10000 =
      paralelo?.promedio && paralelo.promedio > 0
        ? Math.round(paralelo.promedio * RATE_SCALE)
        : null;
    if (bcvX10000 === null && paraleloX10000 === null) return null;
    return { bcvX10000, paraleloX10000 };
  } catch {
    return null;
  }
}

/**
 * Refresca la caché del día de hoy. Falla en silencio sin internet — el
 * dashboard sigue funcionando con la última caché o la tasa manual.
 * Devuelve true si logró actualizar.
 */
export async function actualizarCacheTasas(): Promise<boolean> {
  const tasas = await fetchTasasDolarApi();
  if (!tasas) return false;

  const hoy = hoyISO();
  const existente = await db.exchange_rates_cache.where("fecha").equals(hoy).first();
  const registro = {
    fecha: hoy,
    tasa_bcv_x10000: tasas.bcvX10000,
    tasa_paralelo_x10000: tasas.paraleloX10000,
    tasa_binance_x10000: tasas.paraleloX10000,
    timestamp_consulta: Date.now(),
  };
  if (existente?.id) {
    await db.exchange_rates_cache.update(existente.id, registro);
  } else {
    await db.exchange_rates_cache.add(registro);
  }
  return true;
}

export interface TasaResuelta {
  tasaX10000: number;
  fuente: FuenteTasa | null;
}

/**
 * Resuelve la tasa vigente: caché de hoy → caché más reciente disponible →
 * tasa manual → sin configurar. Si tasa_preferida="manual" se usa esa
 * directo, sin tocar la caché online.
 */
export async function getTasaVigente(): Promise<TasaResuelta> {
  const settings = await db.settings.get(1);
  const preferida = settings?.tasa_preferida ?? "bcv";
  const manual = settings?.tasa_manual_x10000 ?? 0;

  if (preferida === "manual") {
    return manual > 0
      ? { tasaX10000: manual, fuente: "manual" }
      : { tasaX10000: 0, fuente: null };
  }

  const campo = preferida === "bcv" ? "tasa_bcv_x10000" : "tasa_paralelo_x10000";
  const hoy = hoyISO();

  const cacheHoy = await db.exchange_rates_cache.where("fecha").equals(hoy).first();
  if (cacheHoy?.[campo]) {
    return { tasaX10000: cacheHoy[campo]!, fuente: preferida };
  }

  const todas = await db.exchange_rates_cache.orderBy("fecha").reverse().toArray();
  const conValor = todas.find((c) => c[campo]);
  if (conValor) {
    return { tasaX10000: conValor[campo]!, fuente: preferida };
  }

  if (manual > 0) return { tasaX10000: manual, fuente: "manual" };
  return { tasaX10000: 0, fuente: null };
}

/** Etiqueta corta para mostrar la fuente de una tasa en la UI. */
export function etiquetaFuente(fuente: FuenteTasa | null | undefined): string {
  if (fuente === "bcv") return "BCV";
  if (fuente === "paralelo") return "Paralelo";
  if (fuente === "manual") return "Manual";
  return "—";
}
