import { createClient } from "@supabase/supabase-js";
import { leerTodoLocal, reemplazarTodoLocal, type BackupData } from "@/services/backup";

/**
 * Claves públicas: la "anon key" está hecha para vivir en el cliente — la
 * protección real es RLS del lado de Supabase, no el secreto de esta key.
 * NUNCA poner acá la service_role ni la secret key (esas sí saltan RLS).
 */
const SUPABASE_URL = "https://yfqvfeohsmlehafqiogx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmcXZmZW9oc21sZWhhZnFpb2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMzU5NDAsImV4cCI6MjA5OTcxMTk0MH0.U46co2ylRfjz5MG_lAwx8HDz3am4Jt3OjEuCpWaMHqA";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function borrarYSubir(tabla: string, filas: unknown[]): Promise<void> {
  const { error: errBorrar } = await supabase.from(tabla).delete().not("id", "is", null);
  if (errBorrar) throw new Error(`No se pudo limpiar "${tabla}" en la nube: ${errBorrar.message}`);
  if (filas.length === 0) return;
  const { error: errInsertar } = await supabase.from(tabla).insert(filas);
  if (errInsertar) throw new Error(`No se pudo subir "${tabla}": ${errInsertar.message}`);
}

/** Sube todo lo local a Supabase, reemplazando lo que hubiera ahí (push completo). */
export async function subirNube(): Promise<void> {
  const data = await leerTodoLocal();
  await borrarYSubir("settings", data.settings);
  await borrarYSubir("accounts", data.accounts);
  await borrarYSubir("categories", data.categories);
  await borrarYSubir("transactions", data.transactions);
  await borrarYSubir("exchange_rates_cache", data.exchange_rates_cache);
  await borrarYSubir("debts", data.debts);
  await borrarYSubir("payday_plans", data.payday_plans);
  await borrarYSubir("weekly_envelopes", data.weekly_envelopes);
  await borrarYSubir("recurring_transactions", data.recurring_transactions);
}

async function bajarTabla<T>(tabla: string): Promise<T[]> {
  const { data, error } = await supabase.from(tabla).select("*");
  if (error) throw new Error(`No se pudo bajar "${tabla}": ${error.message}`);
  return (data ?? []) as T[];
}

/**
 * Baja todo de Supabase y reemplaza los datos locales (pull completo).
 * Destructivo localmente — quien llame esto debe confirmar con el usuario.
 */
export async function bajarNube(): Promise<void> {
  const data: BackupData = {
    version: 1,
    exportadoEn: "",
    settings: await bajarTabla("settings"),
    accounts: await bajarTabla("accounts"),
    categories: await bajarTabla("categories"),
    transactions: await bajarTabla("transactions"),
    exchange_rates_cache: await bajarTabla("exchange_rates_cache"),
    debts: await bajarTabla("debts"),
    payday_plans: await bajarTabla("payday_plans"),
    weekly_envelopes: await bajarTabla("weekly_envelopes"),
    recurring_transactions: await bajarTabla("recurring_transactions"),
  };
  await reemplazarTodoLocal(data);
}
