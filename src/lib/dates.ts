/**
 * Utilidades de fechas. Convención: las fechas se guardan como strings ISO
 * LOCALES ("YYYY-MM-DD" para días, "YYYY-MM-DDTHH:mm:ss" para instantes),
 * ordenables lexicográficamente. Nunca se usa toISOString() (UTC) porque
 * desplazaría el día local del usuario (Venezuela, UTC-4).
 */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha local de hoy: "YYYY-MM-DD". */
export function hoyISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Instante local: "YYYY-MM-DDTHH:mm:ss". */
export function ahoraISO(d: Date = new Date()): string {
  return `${hoyISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function addDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + dias);
  return hoyISO(fecha);
}

/** Días restantes desde `hoy` hasta `fin`, ambos inclusive. Mínimo 1. */
export function diasRestantes(hoy: string, fin: string): number {
  const ms = fechaAMs(fin) - fechaAMs(hoy);
  const dias = Math.round(ms / 86_400_000) + 1;
  return Math.max(1, dias);
}

function fechaAMs(fechaISO: string): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1).getTime();
}

/** Primer día del mes de una fecha: "YYYY-MM-01". */
export function inicioMes(fechaISO: string): string {
  return `${fechaISO.slice(0, 7)}-01`;
}

/** true si fechaISO (día o instante) cae dentro de [inicio, fin] (días). */
export function dentroDeRango(fechaISO: string, inicio: string, fin: string): boolean {
  const dia = fechaISO.slice(0, 10);
  return dia >= inicio && dia <= fin;
}
