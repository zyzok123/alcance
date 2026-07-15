import {
  db,
  type Account,
  type Category,
  type Debt,
  type ExchangeRateCache,
  type PaydayPlan,
  type RecurringTransaction,
  type Settings,
  type Transaction,
  type WeeklyEnvelope,
} from "@/db/schema";
import { ahoraISO, hoyISO } from "@/lib/dates";

const VERSION_BACKUP = 1;

export interface BackupData {
  version: number;
  exportadoEn: string;
  settings: Settings[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  exchange_rates_cache: ExchangeRateCache[];
  debts: Debt[];
  payday_plans: PaydayPlan[];
  weekly_envelopes: WeeklyEnvelope[];
  recurring_transactions: RecurringTransaction[];
}

/** Lee todas las tablas locales tal cual están ahora mismo. */
export async function leerTodoLocal(): Promise<BackupData> {
  return {
    version: VERSION_BACKUP,
    exportadoEn: ahoraISO(),
    settings: await db.settings.toArray(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
    exchange_rates_cache: await db.exchange_rates_cache.toArray(),
    debts: await db.debts.toArray(),
    payday_plans: await db.payday_plans.toArray(),
    weekly_envelopes: await db.weekly_envelopes.toArray(),
    recurring_transactions: await db.recurring_transactions.toArray(),
  };
}

/** Vuelca toda la BD a JSON y dispara la descarga (funciona en WebView vía blob). */
export async function exportarJSON(): Promise<void> {
  const data = await leerTodoLocal();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alcance-backup-${hoyISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function esBackupValido(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  const claves: (keyof BackupData)[] = [
    "settings",
    "accounts",
    "categories",
    "transactions",
    "exchange_rates_cache",
    "debts",
    "payday_plans",
    "weekly_envelopes",
    "recurring_transactions",
  ];
  return claves.every((k) => Array.isArray(d[k]));
}

/**
 * Reemplaza TODOS los datos locales por los de `data`. Destructivo e
 * irreversible — quien llame esto debe confirmar con el usuario antes.
 * Preserva los ids originales (bulkAdd) para no romper las referencias
 * cruzadas entre tablas (categoria_id, cuenta_id, recurrente_id, etc).
 * Compartido por importarJSON (archivo local) y services/sync.ts (nube).
 */
export async function reemplazarTodoLocal(data: BackupData): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.settings,
      db.accounts,
      db.categories,
      db.transactions,
      db.exchange_rates_cache,
      db.debts,
      db.payday_plans,
      db.weekly_envelopes,
      db.recurring_transactions,
    ],
    async () => {
      await db.settings.clear();
      await db.accounts.clear();
      await db.categories.clear();
      await db.transactions.clear();
      await db.exchange_rates_cache.clear();
      await db.debts.clear();
      await db.payday_plans.clear();
      await db.weekly_envelopes.clear();
      await db.recurring_transactions.clear();

      if (data.settings.length) await db.settings.bulkAdd(data.settings);
      if (data.accounts.length) await db.accounts.bulkAdd(data.accounts);
      if (data.categories.length) await db.categories.bulkAdd(data.categories);
      if (data.transactions.length) await db.transactions.bulkAdd(data.transactions);
      if (data.exchange_rates_cache.length)
        await db.exchange_rates_cache.bulkAdd(data.exchange_rates_cache);
      if (data.debts.length) await db.debts.bulkAdd(data.debts);
      if (data.payday_plans.length) await db.payday_plans.bulkAdd(data.payday_plans);
      if (data.weekly_envelopes.length) await db.weekly_envelopes.bulkAdd(data.weekly_envelopes);
      if (data.recurring_transactions.length)
        await db.recurring_transactions.bulkAdd(data.recurring_transactions);
    },
  );
}

/**
 * Reemplaza TODOS los datos locales por los del archivo JSON exportado.
 * Destructivo e irreversible — la UI debe confirmar con el usuario antes.
 */
export async function importarJSON(archivo: File): Promise<void> {
  const texto = await archivo.text();
  let data: unknown;
  try {
    data = JSON.parse(texto);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!esBackupValido(data)) {
    throw new Error("El archivo no tiene el formato esperado de un backup de Alcance.");
  }
  await reemplazarTodoLocal(data);
}
