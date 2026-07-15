import { LocalNotifications } from "@capacitor/local-notifications";

const ID_RECORDATORIO_DIARIO = 1;

/** Pide permiso de notificaciones. Devuelve true si quedó concedido. */
export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  const actual = await LocalNotifications.checkPermissions();
  if (actual.display === "granted") return true;
  const pedido = await LocalNotifications.requestPermissions();
  return pedido.display === "granted";
}

/** Programa (o reemplaza) el recordatorio diario a la hora "HH:mm". */
export async function programarRecordatorioDiario(horaHHmm: string): Promise<boolean> {
  const concedido = await solicitarPermisoNotificaciones();
  if (!concedido) return false;

  const [hora, minuto] = horaHHmm.split(":").map(Number);
  await LocalNotifications.cancel({ notifications: [{ id: ID_RECORDATORIO_DIARIO }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: ID_RECORDATORIO_DIARIO,
        title: "Alcance",
        body: "Registrá tus gastos de hoy — que el dinero no se te escape.",
        schedule: { on: { hour: hora ?? 8, minute: minuto ?? 0 }, repeats: true },
      },
    ],
  });
  return true;
}

export async function cancelarRecordatorioDiario(): Promise<void> {
  await LocalNotifications.cancel({ notifications: [{ id: ID_RECORDATORIO_DIARIO }] });
}
