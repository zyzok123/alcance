import { useEffect, useState } from "react";
import type { Settings } from "@/db/schema";
import { actualizarSettings, useSettings } from "@/hooks/useSettings";
import { formatTasa, parseTasaX10000, parseToCentavos, formatCentavos } from "@/lib/money";
import { APP_VERSION, buscarActualizacion } from "@/services/updates";
import { actualizarCacheTasas } from "@/services/tasas";
import { useTasaVigente } from "@/hooks/useTasaVigente";
import { cancelarRecordatorioDiario, programarRecordatorioDiario } from "@/services/notificaciones";
import { exportarJSON, importarJSON } from "@/services/backup";
import { bajarNube, subirNube } from "@/services/sync";
import { autenticar, biometriaDisponible } from "@/services/biometria";
import { Sheet } from "@/components/ui/Sheet";
import { HudButton } from "@/components/ui/HudButton";
import { cn, glassInput } from "@/lib/utils";

const OPCIONES_TASA: { valor: Settings["tasa_preferida"]; etiqueta: string }[] = [
  { valor: "bcv", etiqueta: "BCV" },
  { valor: "paralelo", etiqueta: "Paralelo" },
  { valor: "manual", etiqueta: "Manual" },
];

export function Ajustes({
  abierto,
  onCerrar,
  onAbrirRecurrentes,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onAbrirRecurrentes: () => void;
}) {
  const settings = useSettings();
  const tasaVigente = useTasaVigente();
  const [tasa, setTasa] = useState("");
  const [umbral, setUmbral] = useState("");
  const [estadoUpdate, setEstadoUpdate] = useState<"idle" | "buscando" | "aldia" | "hay">("idle");
  const [urlUpdate, setUrlUpdate] = useState<string | null>(null);
  const [estadoTasas, setEstadoTasas] = useState<"idle" | "buscando" | "ok" | "error">("idle");
  const [hora, setHora] = useState("08:00");
  const [errorNotif, setErrorNotif] = useState(false);
  const [archivoPendiente, setArchivoPendiente] = useState<File | null>(null);
  const [estadoImport, setEstadoImport] = useState<"idle" | "importando" | "error">("idle");
  const [estadoSubir, setEstadoSubir] = useState<"idle" | "subiendo" | "ok" | "error">("idle");
  const [estadoBajar, setEstadoBajar] = useState<"idle" | "bajando" | "error">("idle");
  const [confirmarBajar, setConfirmarBajar] = useState(false);
  const [errorBiometria, setErrorBiometria] = useState(false);

  useEffect(() => {
    if (!settings || !abierto) return;
    setTasa(settings.tasa_manual_x10000 > 0 ? formatTasa(settings.tasa_manual_x10000) : "");
    setUmbral(formatCentavos(settings.umbral_hormiga_usd_centavos));
    setHora(settings.hora_notificacion_diaria);
    setEstadoUpdate("idle");
    setErrorNotif(false);
  }, [settings?.id, abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar() {
    const tasaX = parseTasaX10000(tasa);
    const umbralC = parseToCentavos(umbral);
    await actualizarSettings({
      tasa_manual_x10000: tasaX,
      umbral_hormiga_usd_centavos: umbralC > 0 ? umbralC : 300,
    });
    onCerrar();
  }

  async function toggleBajoEstimulo() {
    await actualizarSettings({ modo_bajo_estimulo: !settings?.modo_bajo_estimulo });
  }

  async function toggleNotificaciones() {
    const activar = !settings?.notificaciones_activas;
    if (activar) {
      const ok = await programarRecordatorioDiario(hora);
      if (!ok) {
        setErrorNotif(true);
        return;
      }
    } else {
      await cancelarRecordatorioDiario();
    }
    setErrorNotif(false);
    await actualizarSettings({ notificaciones_activas: activar });
  }

  async function guardarHora(nuevaHora: string) {
    setHora(nuevaHora);
    await actualizarSettings({ hora_notificacion_diaria: nuevaHora });
    if (settings?.notificaciones_activas) {
      await programarRecordatorioDiario(nuevaHora);
    }
  }

  async function elegirTasaPreferida(valor: Settings["tasa_preferida"]) {
    await actualizarSettings({ tasa_preferida: valor });
  }

  async function actualizarTasasAhora() {
    setEstadoTasas("buscando");
    const ok = await actualizarCacheTasas();
    setEstadoTasas(ok ? "ok" : "error");
  }

  async function confirmarImportacion() {
    if (!archivoPendiente) return;
    setEstadoImport("importando");
    try {
      await importarJSON(archivoPendiente);
      setArchivoPendiente(null);
      setEstadoImport("idle");
    } catch {
      setEstadoImport("error");
    }
  }

  async function subir() {
    setEstadoSubir("subiendo");
    try {
      await subirNube();
      setEstadoSubir("ok");
    } catch {
      setEstadoSubir("error");
    }
  }

  async function confirmarBajarNube() {
    setEstadoBajar("bajando");
    try {
      await bajarNube();
      setConfirmarBajar(false);
      setEstadoBajar("idle");
    } catch {
      setEstadoBajar("error");
    }
  }

  async function toggleBiometria() {
    const activar = !settings?.bloqueo_biometrico_activo;
    if (activar) {
      const disponible = await biometriaDisponible();
      if (!disponible) {
        setErrorBiometria(true);
        return;
      }
      const ok = await autenticar();
      if (!ok) {
        setErrorBiometria(true);
        return;
      }
    }
    setErrorBiometria(false);
    await actualizarSettings({ bloqueo_biometrico_activo: activar });
  }

  async function chequearUpdate() {
    setEstadoUpdate("buscando");
    const r = await buscarActualizacion();
    if (r) {
      setUrlUpdate(r.url);
      setEstadoUpdate("hay");
    } else {
      setEstadoUpdate("aldia");
    }
  }

  return (
    <Sheet abierto={abierto} onCerrar={onCerrar} titulo="Ajustes">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Tasa preferida
          </span>
          <div className="flex glass rounded-full p-1">
            {OPCIONES_TASA.map((op) => (
              <button
                key={op.valor}
                onClick={() => void elegirTasaPreferida(op.valor)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-full font-display text-xs transition-colors",
                  settings?.tasa_preferida === op.valor
                    ? "bg-primario/90 text-fondo"
                    : "text-texto-sec",
                )}
              >
                {op.etiqueta}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-texto-sec">
            Vigente: {tasaVigente && tasaVigente.tasaX10000 > 0
              ? `Bs ${formatTasa(tasaVigente.tasaX10000)} (${tasaVigente.fuente === "bcv" ? "BCV" : tasaVigente.fuente === "paralelo" ? "Paralelo" : "Manual"})`
              : "sin configurar"}
          </p>
          <HudButton
            variante="fantasma"
            onClick={() => void actualizarTasasAhora()}
            disabled={estadoTasas === "buscando"}
          >
            {estadoTasas === "buscando"
              ? "Consultando…"
              : estadoTasas === "ok"
                ? "Tasas actualizadas ✓"
                : estadoTasas === "error"
                  ? "Sin internet — reintentar"
                  : "Actualizar tasas ahora"}
          </HudButton>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Tasa manual (Bs por 1 USD)
          </span>
          <input
            inputMode="decimal"
            placeholder="ej. 40,00"
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            className={glassInput}
          />
          <span className="text-[11px] text-texto-sec">
            Se usa si elegís "Manual" arriba, o como último recurso si no hay
            internet ni caché guardada.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Umbral gasto hormiga (USD)
          </span>
          <input
            inputMode="decimal"
            value={umbral}
            onChange={(e) => setUmbral(e.target.value)}
            className={glassInput}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Recordatorio diario
          </span>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={hora}
              onChange={(e) => void guardarHora(e.target.value)}
              className={cn(glassInput, "w-auto")}
            />
            <button
              onClick={() => void toggleNotificaciones()}
              className="glass rounded-full px-4 py-2 flex items-center gap-2 grow justify-between"
            >
              <span className="text-sm text-texto">Activo</span>
              <span
                className={cn(
                  "font-display text-xs tracking-wider",
                  settings?.notificaciones_activas ? "text-exito" : "text-texto-sec",
                )}
              >
                {settings?.notificaciones_activas ? "ON" : "OFF"}
              </span>
            </button>
          </div>
          {errorNotif && (
            <p className="text-[11px] text-alerta">
              Sin permiso de notificaciones — revisá los ajustes del sistema.
            </p>
          )}
        </div>

        <button
          onClick={() => void toggleBajoEstimulo()}
          className="glass rounded-xl px-3 py-3 flex items-center justify-between"
        >
          <span className="text-sm text-texto">Modo bajo estímulo</span>
          <span
            className={cn(
              "font-display text-xs tracking-wider",
              settings?.modo_bajo_estimulo ? "text-exito" : "text-texto-sec",
            )}
          >
            {settings?.modo_bajo_estimulo ? "ON" : "OFF"}
          </span>
        </button>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => void toggleBiometria()}
            className="glass rounded-xl px-3 py-3 flex items-center justify-between"
          >
            <span className="text-sm text-texto">Bloqueo con huella/PIN</span>
            <span
              className={cn(
                "font-display text-xs tracking-wider",
                settings?.bloqueo_biometrico_activo ? "text-exito" : "text-texto-sec",
              )}
            >
              {settings?.bloqueo_biometrico_activo ? "ON" : "OFF"}
            </span>
          </button>
          {errorBiometria && (
            <p className="text-[11px] text-alerta">
              No se pudo activar: sin huella/PIN configurado en el equipo, o
              verificación cancelada.
            </p>
          )}
        </div>

        <HudButton onClick={() => void guardar()}>Guardar</HudButton>

        <HudButton variante="fantasma" onClick={onAbrirRecurrentes}>
          Gastos e ingresos recurrentes
        </HudButton>

        <div className="border-t border-borde pt-4 flex flex-col gap-2">
          <p className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Backup
          </p>
          <HudButton variante="fantasma" onClick={() => void exportarJSON()}>
            Exportar backup (JSON)
          </HudButton>
          <label className="glass rounded-full px-4 py-3 flex items-center justify-center cursor-pointer">
            <span className="font-display text-sm tracking-wider uppercase text-texto">
              Importar backup
            </span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setArchivoPendiente(f);
                e.target.value = "";
              }}
            />
          </label>
          {archivoPendiente && (
            <div className="glass rounded-xl p-3 flex flex-col gap-2">
              <p className="text-sm text-peligro">
                Esto reemplaza TODOS tus datos actuales por los de "{archivoPendiente.name}".
                No se puede deshacer. ¿Seguro?
              </p>
              {estadoImport === "error" && (
                <p className="text-[11px] text-alerta">
                  No se pudo importar: archivo inválido o corrupto.
                </p>
              )}
              <div className="flex gap-2">
                <HudButton
                  variante="fantasma"
                  className="grow"
                  onClick={() => setArchivoPendiente(null)}
                  disabled={estadoImport === "importando"}
                >
                  Cancelar
                </HudButton>
                <HudButton
                  variante="peligro"
                  className="grow"
                  onClick={() => void confirmarImportacion()}
                  disabled={estadoImport === "importando"}
                >
                  {estadoImport === "importando" ? "Importando…" : "Sí, reemplazar todo"}
                </HudButton>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-borde pt-4 flex flex-col gap-2">
          <p className="text-xs text-texto-sec font-display tracking-wider uppercase">
            Sincronizar con la nube (opcional)
          </p>
          <HudButton
            variante="fantasma"
            onClick={() => void subir()}
            disabled={estadoSubir === "subiendo"}
          >
            {estadoSubir === "subiendo"
              ? "Subiendo…"
              : estadoSubir === "ok"
                ? "Subido ✓"
                : estadoSubir === "error"
                  ? "Error al subir — reintentar"
                  : "Subir a la nube"}
          </HudButton>
          <HudButton
            variante="fantasma"
            onClick={() => setConfirmarBajar(true)}
            disabled={estadoBajar === "bajando"}
          >
            {estadoBajar === "bajando" ? "Bajando…" : "Bajar de la nube"}
          </HudButton>
          {confirmarBajar && (
            <div className="glass rounded-xl p-3 flex flex-col gap-2">
              <p className="text-sm text-peligro">
                Esto reemplaza TODOS tus datos actuales por los que haya en la
                nube. No se puede deshacer. ¿Seguro?
              </p>
              {estadoBajar === "error" && (
                <p className="text-[11px] text-alerta">
                  No se pudo bajar — revisá tu conexión.
                </p>
              )}
              <div className="flex gap-2">
                <HudButton
                  variante="fantasma"
                  className="grow"
                  onClick={() => setConfirmarBajar(false)}
                  disabled={estadoBajar === "bajando"}
                >
                  Cancelar
                </HudButton>
                <HudButton
                  variante="peligro"
                  className="grow"
                  onClick={() => void confirmarBajarNube()}
                  disabled={estadoBajar === "bajando"}
                >
                  Sí, reemplazar todo
                </HudButton>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-borde pt-4 flex flex-col gap-2">
          <p className="text-[11px] text-texto-sec font-display">
            Versión: {APP_VERSION}
          </p>
          {estadoUpdate === "hay" && urlUpdate ? (
            <HudButton
              variante="secundario"
              onClick={() => window.open(urlUpdate, "_blank")}
            >
              Descargar nueva versión
            </HudButton>
          ) : (
            <HudButton
              variante="fantasma"
              onClick={() => void chequearUpdate()}
              disabled={estadoUpdate === "buscando"}
            >
              {estadoUpdate === "buscando"
                ? "Buscando…"
                : estadoUpdate === "aldia"
                  ? "Estás al día ✓"
                  : "Buscar actualización"}
            </HudButton>
          )}
        </div>
      </div>
    </Sheet>
  );
}
