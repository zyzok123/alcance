import { db, type Category } from "./schema";

/**
 * Seeds: se ejecutan una sola vez al crear la BD (evento "populate" de Dexie).
 */

const CATEGORIAS_SEED: Omit<Category, "id">[] = [
  // Favoritas: aparecen primero en el grid de registro rápido.
  { nombre: "Comida", tipo: "gasto", icono: "utensils", color: "alerta", es_favorita: true },
  { nombre: "Transporte", tipo: "gasto", icono: "bus", color: "primario", es_favorita: true },
  { nombre: "Delivery", tipo: "gasto", icono: "bike", color: "secundario", es_favorita: true },
  { nombre: "Mercado", tipo: "gasto", icono: "shopping-cart", color: "exito", es_favorita: true },
  { nombre: "Servicios", tipo: "gasto", icono: "zap", color: "primario", es_favorita: true },
  { nombre: "Ocio", tipo: "gasto", icono: "gamepad-2", color: "secundario", es_favorita: true },
  { nombre: "Salud", tipo: "gasto", icono: "heart-pulse", color: "peligro", es_favorita: true },
  { nombre: "Hogar", tipo: "gasto", icono: "home", color: "exito", es_favorita: true },
  // No favoritas
  { nombre: "Ropa", tipo: "gasto", icono: "shirt", color: "primario", es_favorita: false },
  { nombre: "Educación", tipo: "gasto", icono: "book-open", color: "primario", es_favorita: false },
  { nombre: "Mascotas", tipo: "gasto", icono: "paw-print", color: "alerta", es_favorita: false },
  { nombre: "Regalos", tipo: "gasto", icono: "gift", color: "secundario", es_favorita: false },
  { nombre: "Otros", tipo: "gasto", icono: "circle-ellipsis", color: "primario", es_favorita: false },
  // Ingresos
  { nombre: "Sueldo", tipo: "ingreso", icono: "banknote", color: "exito", es_favorita: false },
  { nombre: "Extra", tipo: "ingreso", icono: "plus-circle", color: "exito", es_favorita: false },
  // Transferencias
  { nombre: "Transferencia", tipo: "transferencia", icono: "arrow-left-right", color: "primario", es_favorita: false },
];

db.on("populate", async () => {
  const cuentaBsId = await db.accounts.add({
    nombre: "Efectivo Bs",
    tipo: "efectivo_bs",
    moneda: "VES",
    balance_actual_centavos: 0,
    activa: true,
  });

  await db.accounts.add({
    nombre: "Efectivo USD",
    tipo: "efectivo_usd",
    moneda: "USD",
    balance_actual_centavos: 0,
    activa: true,
  });

  await db.categories.bulkAdd(CATEGORIAS_SEED);

  await db.settings.add({
    id: 1,
    umbral_hormiga_usd_centavos: 300,
    tasa_preferida: "bcv",
    tasa_manual_x10000: 0, // sin configurar: el dashboard lo pide
    fechas_de_cobro: [15, 30],
    moneda_display: "USD",
    cuenta_default_id: cuentaBsId ?? null,
    moneda_registro_default: "VES",
    hora_notificacion_diaria: "08:00",
    modo_bajo_estimulo: false,
  });
});
