import Dexie, { type EntityTable } from "dexie";
import type { Moneda } from "@/lib/money";

/**
 * Esquema Dexie completo (todas las fases). Fuente de verdad local.
 *
 * Convenciones:
 * - Todo campo `*_centavos` es un ENTERO en unidades menores (ver lib/money).
 * - Toda tasa `*_x10000` es un ENTERO = tasa * 10000.
 * - Fechas: strings ISO locales (ver lib/dates).
 * - `monto_gastado_usd` de weekly_envelopes NO se almacena: se calcula
 *   siempre desde transactions para no desincronizarse.
 */

export type TipoCuenta =
  | "banco_bs"
  | "banco_divisas"
  | "efectivo_bs"
  | "efectivo_usd"
  | "binance"
  | "zelle"
  | "otro";

export type TipoCategoria = "gasto" | "ingreso" | "transferencia";
export type FuenteTasa = "bcv" | "paralelo" | "manual";

export interface Settings {
  id: number; // singleton: siempre 1
  umbral_hormiga_usd_centavos: number; // default 300 = $3
  /**
   * Fase 3: fuente de tasa preferida. "paralelo" en DolarAPI es el mercado
   * calle/Binance (misma cifra) — no hay fuente separada de Binance.
   * "manual" fuerza tasa_manual_x10000 aunque haya caché online.
   */
  tasa_preferida: "bcv" | "paralelo" | "manual";
  /** Tasa manual: override si tasa_preferida="manual", o último recurso si no hay caché. 0 = sin configurar. */
  tasa_manual_x10000: number;
  fechas_de_cobro: number[]; // días del mes, ej. [15, 30]
  moneda_display: "USD" | "VES";
  cuenta_default_id: number | null;
  moneda_registro_default: Moneda;
  hora_notificacion_diaria: string; // "HH:mm"
  /** Fase 4: recordatorio diario local (@capacitor/local-notifications). */
  notificaciones_activas: boolean;
  modo_bajo_estimulo: boolean;
  /** Fase 5: pide huella/PIN al abrir la app (@capgo/capacitor-native-biometric). */
  bloqueo_biometrico_activo: boolean;
}

export interface Account {
  id?: number;
  nombre: string;
  tipo: TipoCuenta;
  moneda: Moneda;
  balance_actual_centavos: number;
  activa: boolean;
}

export interface Category {
  id?: number;
  nombre: string;
  tipo: TipoCategoria;
  icono: string; // nombre de ícono lucide
  color: string; // token: primario | secundario | exito | alerta | peligro
  es_favorita: boolean;
}

export interface Transaction {
  id?: number;
  monto_centavos: number;
  moneda: Moneda;
  tasa_cambio_al_momento_x10000: number | null; // null si moneda ya es USD
  fuente_tasa: FuenteTasa | null;
  monto_usd_centavos: number; // equivalente congelado; NUNCA se recalcula
  cuenta_origen_id: number | null;
  cuenta_destino_id: number | null; // null si es gasto/ingreso simple
  categoria_id: number | null;
  es_hormiga: boolean; // auto: gasto con monto_usd < umbral
  fecha: string; // ISO local "YYYY-MM-DDTHH:mm:ss"
  nota: string;
  recurrente_id: number | null;
}

export interface ExchangeRateCache {
  id?: number;
  fecha: string; // "YYYY-MM-DD"
  tasa_bcv_x10000: number | null;
  tasa_paralelo_x10000: number | null;
  tasa_binance_x10000: number | null;
  timestamp_consulta: number; // epoch ms
}

export interface Debt {
  id?: number;
  descripcion: string;
  acreedor: string;
  monto_centavos: number;
  moneda: Moneda;
  fecha_limite: string | null; // "YYYY-MM-DD"
  estado: "pendiente" | "pagada";
  transaction_id: number | null; // se llena al pagarla
}

export interface PaydayPlan {
  id?: number;
  fecha_cobro: string;
  monto_total_centavos: number;
  moneda_cobro: Moneda;
  monto_usd_centavos: number;
  total_deudas_pagadas_centavos: number;
  monto_protegido_centavos: number;
  monto_para_vivir_centavos: number;
  num_semanas: number;
  notas: string;
}

export interface WeeklyEnvelope {
  id?: number;
  /** null = sobre creado manualmente (Fase 1, sin payday plan). */
  payday_plan_id: number | null;
  semana_numero: number;
  fecha_inicio: string; // "YYYY-MM-DD"
  fecha_fin: string; // "YYYY-MM-DD" inclusive
  monto_asignado_usd_centavos: number;
}

export interface RecurringTransaction {
  id?: number;
  descripcion: string;
  monto_centavos: number;
  moneda: Moneda;
  categoria_id: number | null;
  cuenta_id: number | null;
  frecuencia: "mensual" | "quincenal" | "semanal";
  dia_del_periodo: number;
  activa: boolean;
  ultima_generada: string | null;
}

export class AlcanceDB extends Dexie {
  settings!: EntityTable<Settings, "id">;
  accounts!: EntityTable<Account, "id">;
  categories!: EntityTable<Category, "id">;
  transactions!: EntityTable<Transaction, "id">;
  exchange_rates_cache!: EntityTable<ExchangeRateCache, "id">;
  debts!: EntityTable<Debt, "id">;
  payday_plans!: EntityTable<PaydayPlan, "id">;
  weekly_envelopes!: EntityTable<WeeklyEnvelope, "id">;
  recurring_transactions!: EntityTable<RecurringTransaction, "id">;

  constructor() {
    super("alcance");
    // Nota: los booleanos no son indexables en IndexedDB; se filtran en memoria.
    this.version(1).stores({
      settings: "id",
      accounts: "++id, tipo",
      categories: "++id, tipo",
      transactions: "++id, fecha, categoria_id, cuenta_origen_id, recurrente_id",
      exchange_rates_cache: "++id, fecha",
      debts: "++id, estado, fecha_limite",
      payday_plans: "++id, fecha_cobro",
      weekly_envelopes: "++id, payday_plan_id, fecha_inicio, fecha_fin",
      recurring_transactions: "++id, frecuencia",
    });

    // v2 (Fase 2): categoría "Pago de deuda" para instalaciones previas a
    // seed.ts incluirla. Idempotente: no duplica si ya existe.
    this.version(2)
      .stores({})
      .upgrade(async (tx) => {
        const cats = tx.table("categories");
        const yaExiste = (await cats.toArray()).some(
          (c: { nombre: string }) => c.nombre === "Pago de deuda",
        );
        if (!yaExiste) {
          await cats.add({
            nombre: "Pago de deuda",
            tipo: "transferencia",
            icono: "arrow-left-right",
            color: "primario",
            es_favorita: false,
          });
        }
      });

    // v3 (Fase 3): categoría "Ajuste de saldo" para reconciliar cuentas.
    // Idempotente, mismo patrón que v2.
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const cats = tx.table("categories");
        const yaExiste = (await cats.toArray()).some(
          (c: { nombre: string }) => c.nombre === "Ajuste de saldo",
        );
        if (!yaExiste) {
          await cats.add({
            nombre: "Ajuste de saldo",
            tipo: "transferencia",
            icono: "scale",
            color: "secundario",
            es_favorita: false,
          });
        }
      });

    // v4 (Fase 4): notificaciones_activas en settings, default false para
    // instalaciones existentes.
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        const settings = tx.table("settings");
        const row = await settings.get(1);
        if (row && row.notificaciones_activas === undefined) {
          await settings.update(1, { notificaciones_activas: false });
        }
      });

    // v5 (Fase 5): bloqueo_biometrico_activo en settings, default false.
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        const settings = tx.table("settings");
        const row = await settings.get(1);
        if (row && row.bloqueo_biometrico_activo === undefined) {
          await settings.update(1, { bloqueo_biometrico_activo: false });
        }
      });
  }
}

export const db = new AlcanceDB();
